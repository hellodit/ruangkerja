import { describe, expect, it, vi } from 'vitest'
import { createSumopayPayment, parseSumopayEvent, resolvePaymentMode, signSvix, SumopayError, verifySumopayWebhook } from '../../server/utils/sumopay'

// Known-good vector from the Svix reference libraries.
const SVIX = {
  secret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
  id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
  timestamp: '1614265330',
  body: '{"test": 2432232314}',
  signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE='
}

const SECRET = 'whsec_' + Buffer.from('ruangkerja-test-secret').toString('base64')
const NOW = 1_780_000_000

function headers(body: string, opts: { secret?: string, id?: string, timestamp?: number } = {}) {
  const id = opts.id ?? 'msg_abc'
  const timestamp = String(opts.timestamp ?? NOW)
  return {
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': signSvix({ id, timestamp, body, secret: opts.secret ?? SECRET })
  }
}

describe('verifySumopayWebhook (Svix)', () => {
  const body = JSON.stringify({ type: 'payment.completed', data: { order_id: 'RK-261111-ABCDEF' } })

  it('matches the Svix reference vector', () => {
    expect(signSvix({ id: SVIX.id, timestamp: SVIX.timestamp, body: SVIX.body, secret: SVIX.secret })).toBe(SVIX.signature)
    const res = verifySumopayWebhook({
      rawBody: SVIX.body,
      headers: { 'svix-id': SVIX.id, 'svix-timestamp': SVIX.timestamp, 'svix-signature': SVIX.signature },
      secrets: [SVIX.secret],
      now: Number(SVIX.timestamp)
    })
    expect(res).toEqual({ ok: true, id: SVIX.id })
  })

  it('accepts a valid signature and returns the message id', () => {
    expect(verifySumopayWebhook({ rawBody: body, headers: headers(body), secrets: [SECRET], now: NOW })).toEqual({ ok: true, id: 'msg_abc' })
  })

  it('accepts any of several signatures and secrets (rotation)', () => {
    const other = 'whsec_' + Buffer.from('old').toString('base64')
    const h = headers(body)
    h['svix-signature'] = `v1,bm90LWl0 ${h['svix-signature']}`
    expect(verifySumopayWebhook({ rawBody: body, headers: h, secrets: [other, ` ${SECRET} `], now: NOW }).ok).toBe(true)
  })

  it('rejects a tampered body', () => {
    const res = verifySumopayWebhook({ rawBody: body.replace('ABCDEF', 'XXXXXX'), headers: headers(body), secrets: [SECRET], now: NOW })
    expect(res).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  it('rejects a wrong secret', () => {
    const wrong = 'whsec_' + Buffer.from('wrong').toString('base64')
    expect(verifySumopayWebhook({ rawBody: body, headers: headers(body, { secret: wrong }), secrets: [SECRET], now: NOW }).ok).toBe(false)
  })

  it('rejects a signature for another message id', () => {
    const h = { ...headers(body), 'svix-id': 'msg_other' }
    expect(verifySumopayWebhook({ rawBody: body, headers: h, secrets: [SECRET], now: NOW })).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  it('rejects stale and future timestamps', () => {
    const old = headers(body, { timestamp: NOW - 301 })
    expect(verifySumopayWebhook({ rawBody: body, headers: old, secrets: [SECRET], now: NOW })).toEqual({ ok: false, reason: 'stale_timestamp' })
    const future = headers(body, { timestamp: NOW + 301 })
    expect(verifySumopayWebhook({ rawBody: body, headers: future, secrets: [SECRET], now: NOW })).toEqual({ ok: false, reason: 'stale_timestamp' })
  })

  it('rejects missing headers and non-v1 signatures', () => {
    expect(verifySumopayWebhook({ rawBody: body, headers: {}, secrets: [SECRET], now: NOW })).toEqual({ ok: false, reason: 'missing_headers' })
    const h = headers(body)
    h['svix-signature'] = h['svix-signature'].replace('v1,', 'v2,')
    expect(verifySumopayWebhook({ rawBody: body, headers: h, secrets: [SECRET], now: NOW })).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  it('is not configured without a secret', () => {
    expect(verifySumopayWebhook({ rawBody: body, headers: headers(body), secrets: ['', ' '], now: NOW })).toEqual({ ok: false, reason: 'not_configured' })
  })
})

describe('parseSumopayEvent', () => {
  it('reads an enveloped payment.completed event', () => {
    const e = parseSumopayEvent({
      type: 'payment.completed',
      data: { payment_id: 'pay-1', order_id: 'RK-1', amount: 50000, fee: 650, net_amount: 49350, status: 'completed', paid_at: '2026-11-11T03:00:00Z' }
    })
    expect(e).toEqual({ type: 'payment.completed', kind: 'completed', paymentId: 'pay-1', orderId: 'RK-1', amount: 50000, paidAt: new Date('2026-11-11T03:00:00Z') })
  })

  it('reads a flat payload with an event field', () => {
    expect(parseSumopayEvent({ event: 'payment.expired', payment_id: 'p', order_id: 'RK-2', amount: '75000' }))
      .toMatchObject({ kind: 'expired', orderId: 'RK-2', amount: 75000, paidAt: null })
    expect(parseSumopayEvent({ event: 'payment.failed', order_id: 'RK-3' }).kind).toBe('failed')
  })

  it('falls back to the payment status', () => {
    expect(parseSumopayEvent({ data: { order_id: 'RK-4', status: 'PAID' } }).kind).toBe('completed')
  })

  it('leaves unknown events without a kind', () => {
    expect(parseSumopayEvent({ type: 'payment.created', data: { order_id: 'RK-5', status: 'pending' } }).kind).toBeNull()
    expect(parseSumopayEvent(null)).toMatchObject({ kind: null, orderId: null })
  })
})

describe('createSumopayPayment', () => {
  const config = { apiKey: 'sk_test', baseUrl: 'https://api-pay-sandbox.sumopod.com/' }
  const ok = {
    payment_id: '2b9c1d0e-1111-4222-8333-444455556666',
    order_id: 'RK-261111-ABCDEF',
    amount: 50000,
    fee: 650,
    net_amount: 49350,
    payment_link_url: 'https://pay.sumopod.com/pay/2b9c1d0e-1111-4222-8333-444455556666',
    status: 'pending',
    expires_at: '2026-11-12T03:00:00Z'
  }
  const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

  it('posts the order and returns the payment link', async () => {
    const fetchImpl = respond(201, ok)
    const res = await createSumopayPayment(config, {
      orderId: 'RK-261111-ABCDEF',
      amount: 50000,
      successReturnUrl: 'https://app.test/subscription?payment=success',
      cancelReturnUrl: 'https://app.test/subscription?payment=cancel',
      paymentMethodTypeCode: 'QRIS'
    }, fetchImpl as unknown as typeof fetch)

    expect(res).toEqual({ paymentId: ok.payment_id, paymentUrl: ok.payment_link_url, status: 'pending', expiresAt: new Date(ok.expires_at) })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api-pay-sandbox.sumopod.com/api/v1/payments')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('sk_test')
    expect(JSON.parse(init.body as string)).toEqual({
      order_id: 'RK-261111-ABCDEF',
      amount: 50000,
      currency: 'IDR',
      success_return_url: 'https://app.test/subscription?payment=success',
      cancel_return_url: 'https://app.test/subscription?payment=cancel',
      payment_method_type_code: 'QRIS'
    })
  })

  it('omits optional fields', async () => {
    const fetchImpl = respond(200, ok)
    await createSumopayPayment(config, { orderId: ok.order_id, amount: 50000 }, fetchImpl as unknown as typeof fetch)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ order_id: ok.order_id, amount: 50000, currency: 'IDR' })
  })

  it('throws on an API error', async () => {
    const err = await createSumopayPayment(config, { orderId: ok.order_id, amount: 50000 }, respond(401, { message: 'No API key found in request' }) as unknown as typeof fetch).catch(e => e)
    expect(err).toBeInstanceOf(SumopayError)
    expect(err.status).toBe(401)
  })

  it('refuses a non-https payment link or another order id', async () => {
    await expect(createSumopayPayment(config, { orderId: ok.order_id, amount: 50000 }, respond(201, { ...ok, payment_link_url: 'javascript:alert(1)' }) as unknown as typeof fetch)).rejects.toThrow(SumopayError)
    await expect(createSumopayPayment(config, { orderId: ok.order_id, amount: 50000 }, respond(201, { ...ok, order_id: 'other' }) as unknown as typeof fetch)).rejects.toThrow(SumopayError)
  })

  it('requires an API key', async () => {
    await expect(createSumopayPayment({ ...config, apiKey: '' }, { orderId: 'x', amount: 1 })).rejects.toThrow(SumopayError)
  })
})

describe('resolvePaymentMode (NUXT_PAYMENT_MODE)', () => {
  it('defaults to manual', () => {
    expect(resolvePaymentMode('', '')).toEqual({ ok: true, mode: 'manual' })
    expect(resolvePaymentMode(undefined, 'sk_test')).toEqual({ ok: true, mode: 'manual' })
  })

  it('stays manual even when an API key is set', () => {
    expect(resolvePaymentMode('manual', 'sk_test')).toEqual({ ok: true, mode: 'manual' })
  })

  it('uses SumoPay only when asked and configured', () => {
    expect(resolvePaymentMode(' SumoPay ', 'sk_test')).toEqual({ ok: true, mode: 'sumopay' })
    expect(resolvePaymentMode('sumopay', ' ')).toEqual({ ok: false, reason: 'missing_api_key' })
  })

  it('rejects unknown modes instead of guessing', () => {
    expect(resolvePaymentMode('auto', 'sk_test')).toEqual({ ok: false, reason: 'invalid_mode' })
  })
})
