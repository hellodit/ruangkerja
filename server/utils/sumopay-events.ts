import { and, eq } from 'drizzle-orm'
import type { SumopayEvent } from './sumopay'

/**
 * Applies a verified SumoPay event to its order (transactions.code = order_id).
 * Returns quietly for events that need no action; throwing makes the webhook
 * answer 500 so SumoPay retries the delivery.
 */
export async function handleSumopayEvent(e: SumopayEvent) {
  const log = { type: e.type, orderId: e.orderId, paymentId: e.paymentId }
  if (!e.kind || !e.orderId) {
    console.info('[sumopay] event ignored', log)
    return
  }

  const t = schema.transactions
  const [order] = await useDb().select({ id: t.id, status: t.status, method: t.method, amount: t.amount, reference: t.reference })
    .from(t).where(eq(t.code, e.orderId))
  if (!order || order.method !== 'sumopay') {
    console.warn('[sumopay] no SumoPay order for event', log)
    return
  }
  if (e.paymentId && order.reference && order.reference !== e.paymentId) {
    console.error('[sumopay] payment_id does not match the order', { ...log, expected: order.reference })
    return
  }

  if (e.kind === 'completed') {
    if (order.status === 'paid' || order.status === 'refunded') {
      return
    }
    if (e.amount !== null && e.amount !== order.amount) {
      // Never grant a package for a different amount; needs a human look.
      console.error('[sumopay] paid amount does not match the order', { ...log, amount: e.amount, expected: order.amount })
      return
    }
    await activatePendingTransaction(order.id, {
      reference: e.paymentId ?? order.reference,
      paidAt: e.paidAt,
      from: ['pending', 'cancelled', 'failed']
    })
    console.info('[sumopay] order paid', log)
    return
  }

  // failed / expired: close the order only while it still waits for payment.
  await useDb().update(t).set(e.kind === 'failed'
    ? { status: 'failed', notes: 'Pembayaran SumoPay gagal' }
    : { status: 'cancelled', notes: 'Tautan pembayaran SumoPay kedaluwarsa' })
    .where(and(eq(t.id, order.id), eq(t.status, 'pending')))
  console.info(`[sumopay] order ${e.kind}`, log)
}
