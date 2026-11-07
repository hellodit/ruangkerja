import { and, asc, desc, eq, isNull } from 'drizzle-orm'

/** The signed-in user's package status, the packages on sale and any order awaiting payment. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb()
  const now = new Date()
  const t = schema.transactions

  const [packages, active, [pending]] = await Promise.all([
    db.select({ id: schema.packages.id, name: schema.packages.name, description: schema.packages.description, price: schema.packages.price, durationDays: schema.packages.durationDays })
      .from(schema.packages)
      .where(and(eq(schema.packages.isActive, true), isNull(schema.packages.deletedAt)))
      .orderBy(asc(schema.packages.price), asc(schema.packages.createdAt)),
    activePackages([user.id], now),
    db.select({ id: t.id, code: t.code, packageId: t.packageId, packageName: t.packageName, durationDays: t.durationDays, amount: t.amount, createdAt: t.createdAt })
      .from(t).where(and(eq(t.userId, user.id), eq(t.status, 'pending'))).orderBy(desc(t.createdAt)).limit(1)
  ])
  const current = active.get(user.id)
  const lastEnd = current ? null : await lastPaidEnd(user.id)

  return {
    packages,
    current: current ? { name: current.name, endsAt: current.paidUntil, daysLeft: daysLeft(current.paidUntil, now) } : null,
    expiredAt: lastEnd,
    pendingOrder: pending ?? null
  }
})

async function lastPaidEnd(userId: string) {
  const t = schema.transactions
  const [row] = await useDb().select({ end: t.periodEnd }).from(t)
    .where(and(eq(t.userId, userId), eq(t.status, 'paid'))).orderBy(desc(t.periodEnd)).limit(1)
  return row?.end ?? null
}
