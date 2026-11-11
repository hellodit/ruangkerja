/**
 * SumoPay Managed Payment: create a hosted payment link and verify webhook
 * deliveries. Pure module (no Nuxt globals) so it can be unit tested.
 *
 * Docs: https://docs.sumopod.com/guides/managed-payment/create-managed-payment
 *       https://docs.sumopod.com/guides/managed-payment/integrate-managed-payment
 *
 * Webhooks are signed with the Svix scheme:
 *   signed_content = "{svix-id}.{svix-timestamp}.{raw body}"
 *   svix-signature = "v1,{base64(HMAC-SHA256(signed_content, base64decode(secret without 'whsec_')))}"
 * (several space-separated signatures may be sent during a secret rotation).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Payment mode (NUXT_PAYMENT_MODE)
// ---------------------------------------------------------------------------

export const PAYMENT_MODES = ['manual', 'sumopay'] as const
export type PaymentMode = typeof PAYMENT_MODES[number]

export type ResolvedPaymentMode
  = | { ok: true, mode: PaymentMode }
    | { ok: false, reason: 'invalid_mode' | 'missing_api_key' }

/**
 * Reads NUXT_PAYMENT_MODE. Never falls back silently: an unknown value, or
 * 'sumopay' without an API key, is a configuration error.
 */
export function resolvePaymentMode(mode: string | undefined, apiKey: string | undefined): ResolvedPaymentMode {
  const m = (mode ?? '').trim().toLowerCase() || 'manual'
  if (!(PAYMENT_MODES as readonly string[]).includes(m)) {
    return { ok: false, reason: 'invalid_mode' }
  }
  if (m === 'sumopay' && !apiKey?.trim()) {
    return { ok: false, reason: 'missing_api_key' }
  }
  return { ok: true, mode: m as PaymentMode }
}

// ---------------------------------------------------------------------------
// Create payment
// ---------------------------------------------------------------------------

export interface SumopayClientConfig {
  apiKey: string
  /** https://api-pay.sumopod.com (live) or https://api-pay-sandbox.sumopod.com (sandbox). */
  baseUrl: string
}

export interface CreatePaymentInput {
  orderId: string
  /** Whole rupiah. */
  amount: number
  currency?: string
  /** 1–24, SumoPay defaults to 24. */
  expiresInHours?: number
  successReturnUrl?: string
  cancelReturnUrl?: string
  /** e.g. "QRIS"; omitted lets the customer choose on the hosted page. */
  paymentMethodTypeCode?: string
}

const httpsUrl = z.url({ protocol: /^https$/ })

const createPaymentResponse = z.object({
  payment_id: z.string().min(1),
  order_id: z.string(),
  amount: z.number(),
  fee: z.number().optional(),
  net_amount: z.number().optional(),
  payment_link_url: httpsUrl,
  status: z.string(),
  expires_at: z.iso.datetime({ offset: true }).optional().nullable()
})

export interface CreatedPayment {
  paymentId: string
  paymentUrl: string
  status: string
  expiresAt: Date | null
}

export class SumopayError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: unknown) {
    super(message)
    this.name = 'SumopayError'
  }
}

export async function createSumopayPayment(
  config: SumopayClientConfig,
  input: CreatePaymentInput,
  fetchImpl: typeof fetch = fetch
): Promise<CreatedPayment> {
  if (!config.apiKey) {
    throw new SumopayError('SumoPay API key is not configured')
  }
  const body: Record<string, unknown> = {
    order_id: input.orderId,
    amount: input.amount,
    currency: input.currency ?? 'IDR'
  }
  if (input.expiresInHours !== undefined) body.expires_in_hours = Math.min(24, Math.max(1, Math.floor(input.expiresInHours)))
  if (input.successReturnUrl) body.success_return_url = input.successReturnUrl
  if (input.cancelReturnUrl) body.cancel_return_url = input.cancelReturnUrl
  if (input.paymentMethodTypeCode) body.payment_method_type_code = input.paymentMethodTypeCode

  let res: Response
  try {
    res = await fetchImpl(`${config.baseUrl.replace(/\/+$/, '')}/api/v1/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Api-Key': config.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000)
    })
  } catch (err) {
    throw new SumopayError(`SumoPay request failed: ${(err as Error).message}`)
  }

  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  if (!res.ok) {
    throw new SumopayError(`SumoPay responded ${res.status}`, res.status, json)
  }
  const parsed = createPaymentResponse.safeParse(json)
  if (!parsed.success) {
    throw new SumopayError('Unexpected SumoPay response', res.status, json)
  }
  const d = parsed.data
  if (d.order_id !== input.orderId) {
    throw new SumopayError('SumoPay returned a different order_id', res.status, json)
  }
  return {
    paymentId: d.payment_id,
    paymentUrl: d.payment_link_url,
    status: d.status,
    expiresAt: d.expires_at ? new Date(d.expires_at) : null
  }
}

// ---------------------------------------------------------------------------
// Webhook signature (Svix)
// ---------------------------------------------------------------------------

export type VerifyResult
  = | { ok: true, id: string }
    | { ok: false, reason: 'not_configured' | 'missing_headers' | 'stale_timestamp' | 'invalid_signature' }

export interface VerifyInput {
  rawBody: string
  /** Lower-cased header names. */
  headers: Record<string, string | undefined>
  /** Signing secrets (whsec_...); several are accepted during a rotation. */
  secrets: string[]
  /** Unix seconds; injectable for tests. */
  now?: number
  toleranceSeconds?: number
}

function secretKey(secret: string): Buffer | null {
  const raw = secret.trim().replace(/^whsec_/, '')
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  return key.length ? key : null
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export function signSvix(o: { id: string, timestamp: string, body: string, secret: string }): string {
  const key = secretKey(o.secret)
  if (!key) throw new Error('Invalid signing secret')
  return `v1,${createHmac('sha256', key).update(`${o.id}.${o.timestamp}.${o.body}`, 'utf8').digest('base64')}`
}

export function verifySumopayWebhook(input: VerifyInput): VerifyResult {
  const keys = input.secrets.map(secretKey).filter((k): k is Buffer => k !== null)
  if (keys.length === 0) {
    return { ok: false, reason: 'not_configured' }
  }

  const id = input.headers['svix-id']?.trim()
  const timestamp = input.headers['svix-timestamp']?.trim()
  const header = input.headers['svix-signature']?.trim()
  if (!id || !timestamp || !header || !/^\d{1,12}$/.test(timestamp)) {
    return { ok: false, reason: 'missing_headers' }
  }

  const now = input.now ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - Number(timestamp)) > (input.toleranceSeconds ?? 300)) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  const received = header.split(/\s+/)
    .map(part => part.split(','))
    .filter(([version, sig]) => version === 'v1' && sig)
    .map(([, sig]) => sig!)

  const signed = `${id}.${timestamp}.${input.rawBody}`
  // Evaluate every candidate (no early exit) to keep timing uniform.
  let matched = false
  for (const key of keys) {
    const expected = createHmac('sha256', key).update(signed, 'utf8').digest('base64')
    for (const sig of received) {
      if (safeEqual(expected, sig)) matched = true
    }
  }
  return matched ? { ok: true, id } : { ok: false, reason: 'invalid_signature' }
}

// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------

export type SumopayEventKind = 'completed' | 'failed' | 'expired'

export interface SumopayEvent {
  /** Raw event name, e.g. "payment.completed". */
  type: string | null
  kind: SumopayEventKind | null
  paymentId: string | null
  orderId: string | null
  amount: number | null
  paidAt: Date | null
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

const KIND_BY_TYPE: Record<string, SumopayEventKind> = {
  'payment.completed': 'completed',
  'payment.failed': 'failed',
  'payment.expired': 'expired'
}
const KIND_BY_STATUS: Record<string, SumopayEventKind> = {
  completed: 'completed',
  paid: 'completed',
  success: 'completed',
  failed: 'failed',
  expired: 'expired'
}

/**
 * Reads a webhook body. The fields sit either at the top level or under
 * `data`, and the event name in `type` or `event`; the payment status is the
 * fallback when no event name is sent.
 */
export function parseSumopayEvent(payload: unknown): SumopayEvent {
  const root = isRecord(payload) ? payload : {}
  const data = isRecord(root.data) ? root.data : root
  const type = str(root.type) ?? str(root.event) ?? str(data.type) ?? str(data.event)
  const status = str(data.status)?.toLowerCase() ?? null
  const kind = (type ? KIND_BY_TYPE[type.toLowerCase()] : undefined) ?? (status ? KIND_BY_STATUS[status] : undefined) ?? null
  const amount = typeof data.amount === 'number' ? data.amount : typeof data.amount === 'string' && /^\d+(\.\d+)?$/.test(data.amount) ? Number(data.amount) : null
  const paidAtRaw = str(data.paid_at)
  const paidAt = paidAtRaw && !Number.isNaN(Date.parse(paidAtRaw)) ? new Date(paidAtRaw) : null
  return { type, kind, paymentId: str(data.payment_id), orderId: str(data.order_id), amount, paidAt }
}
