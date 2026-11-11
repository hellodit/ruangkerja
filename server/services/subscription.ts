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
      lastPaidEnd: sql<Date | null>`(select max(t.period_end) from transactions t where t.user_id = ${u.id} and t.status = 'paid')`.as('last_paid_end')
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
