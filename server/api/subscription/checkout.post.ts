import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { checkoutSchema } from '#shared/schemas/admin'

/**
 * The user picks a package: creates an order awaiting payment. A user has at
 * most one pending order: choosing again replaces the previous one.
 *
 * NUXT_PAYMENT_MODE picks how it is paid: 'sumopay' gives the order a hosted
 * payment link (returned as `paymentUrl`; the page redirects there) and the
 * webhook marks it paid; 'manual' means a bank transfer an admin confirms.
 *
 * A free (Rp 0) package needs no payment: it is activated at once
 * (`activated: true`), once per user, and leaves any pending order alone.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const { packageId } = await readValidatedBody(event, checkoutSchema.parse)
  const config = useRuntimeConfig(event)
  const sumopay = config.sumopay
  const paymentMode = resolvePaymentMode(config.paymentMode, sumopay.apiKey)
  if (!paymentMode.ok) {
    console.error('[payment] checkout misconfigured', { reason: paymentMode.reason, mode: config.paymentMode })
    throw createError({ statusCode: 503, statusMessage: 'Pembayaran sedang tidak tersedia. Hubungi admin Ruang Kerja.' })
  }

  const order = await useDb().transaction(async (tx) => {
    const user = await lockUser(tx, sessionUser.id)
    if (!user) notFound('Pengguna')
    const [pkg] = await tx.select().from(schema.packages)
      .where(and(eq(schema.packages.id, packageId), eq(schema.packages.isActive, true), isNull(schema.packages.deletedAt)))
    if (!pkg) notFound('Paket')

    const t = schema.transactions
    const code = orderCode(todayInTimeZone('Asia/Jakarta'), randomBytes(6))

    if (pkg.price === 0) {
      if (await hasClaimedFreePackage(tx, user.id)) {
        throw createError({ statusCode: 409, statusMessage: 'Paket gratis hanya bisa dipakai sekali. Pilih paket berbayar untuk melanjutkan.' })
      }
      const now = new Date()
      const period = computePackagePeriod({ now, currentEnd: await paidUntil(tx, user.id, now), durationDays: pkg.durationDays })
      const [row] = await tx.insert(t).values({
        code,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        packageId: pkg.id,
        packageName: pkg.name,
        durationDays: pkg.durationDays,
        amount: 0,
        method: 'manual',
        status: 'paid',
        paidAt: now,
        periodStart: period.start,
        periodEnd: period.end,
        notes: 'Paket gratis'
      }).returning({ id: t.id, code: t.code, method: t.method, packageName: t.packageName, amount: t.amount, durationDays: t.durationDays, createdAt: t.createdAt, periodEnd: t.periodEnd })
      return { ...row!, activated: true }
    }

    await tx.update(t).set({ status: 'cancelled', notes: 'Diganti pesanan baru oleh pengguna' })
      .where(and(eq(t.userId, user.id), eq(t.status, 'pending')))

    const [row] = await tx.insert(t).values({
      code,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      amount: pkg.price,
      method: paymentMode.mode,
      status: 'pending'
    }).returning({ id: t.id, code: t.code, method: t.method, packageName: t.packageName, amount: t.amount, durationDays: t.durationDays, createdAt: t.createdAt, periodEnd: t.periodEnd })
    return { ...row!, activated: false }
  })

  if (order.activated || order.method !== 'sumopay') {
    setResponseStatus(event, 201)
    return { ...order, paymentUrl: null }
  }

  // Outside the database transaction: no row lock is held during the HTTP call.
  const t = schema.transactions
  const returnUrl = `${config.public.siteUrl.replace(/\/+$/, '')}/subscription`
  try {
    const payment = await createSumopayPayment(sumopay, {
      orderId: order.code!,
      amount: order.amount,
      currency: 'IDR',
      successReturnUrl: `${returnUrl}?payment=success`,
      cancelReturnUrl: `${returnUrl}?payment=cancel`,
      paymentMethodTypeCode: sumopay.paymentMethod || undefined
    })
    await useDb().update(t)
      .set({ reference: payment.paymentId, paymentUrl: payment.paymentUrl, paymentExpiresAt: payment.expiresAt })
      .where(eq(t.id, order.id))
    setResponseStatus(event, 201)
    return { ...order, paymentUrl: payment.paymentUrl }
  } catch (err) {
    // Keep the record (the webhook still honours it if SumoPay did create a
    // payment) but take it out of "awaiting payment".
    await useDb().update(t)
      .set({ status: 'failed', notes: 'Gagal membuat pembayaran SumoPay' })
      .where(and(eq(t.id, order.id), eq(t.status, 'pending')))
    console.error('[sumopay] create payment failed', { orderId: order.code, err: err instanceof SumopayError ? { message: err.message, status: err.status, body: err.body } : err })
    throw createError({ statusCode: 502, statusMessage: 'Pembayaran belum bisa dibuat. Coba beberapa saat lagi.' })
  }
})
