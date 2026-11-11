import { and, asc, desc, eq, gt, isNull, or, sql } from 'drizzle-orm'

/**
 * The signed-in user's package status: the packages on sale, then the user
 * with their running coverage, the order awaiting payment and the end of the
 * last paid period (one relational query).
 */
export async function getSubscriptionStatus(userId: string, now = new Date()) {
  const db = useDb()
  const p = schema.packages
  const packages = await db.query.packages.findMany({
    where: and(eq(p.isActive, true), isNull(p.deletedAt)),
    orderBy: [asc(p.price), asc(p.createdAt)],
    columns: { id: true, name: true, description: true, price: true, durationDays: true }
  })

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true },
    extras: u => ({
      lastPaidEnd: sql<Date | null>`(select max(t.period_end) from transactions t where t.user_id = ${u.id} and t.status = 'paid')`.as('last_paid_end'),
      // Same rule as freeTrialClaimed() in services/billing.ts.
      freeClaimed: sql<boolean>`exists(select 1 from transactions t where t.user_id = ${u.id} and t.amount = 0 and t.status = 'paid' and t.code is not null)`.as('free_claimed')
    }),
    with: {
      transactions: {
        where: t => or(and(eq(t.status, 'paid'), gt(t.periodEnd, now)), eq(t.status, 'pending')),
        orderBy: t => [desc(t.periodEnd), desc(t.createdAt)],
        columns: { id: true, code: true, method: true, packageId: true, packageName: true, durationDays: true, amount: true, createdAt: true, status: true, periodStart: true, periodEnd: true, paymentUrl: true, paymentExpiresAt: true }
      }
    }
  })
  const rows = row?.transactions ?? []
  const current = pickActivePackage(rows.filter(t => t.status === 'paid'), now)
  const pending = rows.filter(t => t.status === 'pending').sort((a, b) => +b.createdAt - +a.createdAt)[0]
  return {
    packages,
    current: current ? { name: current.name, endsAt: current.paidUntil, daysLeft: daysLeft(current.paidUntil, now) } : null,
    expiredAt: current ? null : (row?.lastPaidEnd ? new Date(row.lastPaidEnd) : null),
    /** The one-time free (Rp 0) package has been used. */
    freeClaimed: !!row?.freeClaimed,
    pendingOrder: pending
      ? {
          id: pending.id,
          code: pending.code,
          method: pending.method,
          packageId: pending.packageId,
          packageName: pending.packageName,
          durationDays: pending.durationDays,
          amount: pending.amount,
          createdAt: pending.createdAt,
          // SumoPay hosted page; null once the link has expired.
          paymentUrl: pending.paymentUrl && (!pending.paymentExpiresAt || pending.paymentExpiresAt > now) ? pending.paymentUrl : null,
          paymentExpiresAt: pending.paymentExpiresAt
        }
      : null
  }
}

/** Most recent orders and payments shown to the user. */
export const PAYMENT_HISTORY_LIMIT = 50

/**
 * The user's own payment history, newest first. Admin-written notes are not
 * exposed: only the system reasons on cancelled or failed orders.
 */
export async function listPaymentHistory(userId: string, now = new Date()) {
  const t = schema.transactions
  const rows = await useDb().select({
    id: t.id,
    code: t.code,
    packageName: t.packageName,
    durationDays: t.durationDays,
    amount: t.amount,
    method: t.method,
    status: t.status,
    reference: t.reference,
    notes: t.notes,
    paymentUrl: t.paymentUrl,
    paymentExpiresAt: t.paymentExpiresAt,
    periodStart: t.periodStart,
    periodEnd: t.periodEnd,
    paidAt: t.paidAt,
    createdAt: t.createdAt
  }).from(t)
    .where(eq(t.userId, userId))
    .orderBy(desc(t.createdAt))
    .limit(PAYMENT_HISTORY_LIMIT)

  return rows.map(r => ({
    id: r.id,
    code: r.code,
    packageName: r.packageName,
    durationDays: r.durationDays,
    amount: r.amount,
    method: r.method,
    status: r.status,
    // Self-checkout orders carry a code; rows without one were assigned by an admin.
    source: r.code ? 'checkout' as const : 'admin' as const,
    paymentId: r.method === 'sumopay' ? r.reference : null,
    reason: r.status === 'cancelled' || r.status === 'failed' ? r.notes : null,
    paymentUrl: r.status === 'pending' && r.paymentUrl && (!r.paymentExpiresAt || r.paymentExpiresAt > now) ? r.paymentUrl : null,
    paymentExpiresAt: r.status === 'pending' ? r.paymentExpiresAt : null,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    paidAt: r.paidAt,
    createdAt: r.createdAt
  }))
}
