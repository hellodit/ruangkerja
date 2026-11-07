import { asc, count, isNull, sql } from 'drizzle-orm'

/** Admin: all packages (archived ones excluded) with usage numbers. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const p = schema.packages
  const t = schema.transactions
  const now = new Date()

  const [rows, usage] = await Promise.all([
    db.select().from(p).where(isNull(p.deletedAt)).orderBy(asc(p.price), asc(p.createdAt)),
    db.select({
      packageId: t.packageId,
      transactions: count(),
      active: sql<number>`count(distinct ${t.userId}) filter (where ${t.status} = 'paid' and ${t.periodStart} <= ${now.toISOString()} and ${t.periodEnd} > ${now.toISOString()})`.mapWith(Number)
    }).from(t).groupBy(t.packageId)
  ])

  return {
    packages: rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: r.price,
      durationDays: r.durationDays,
      isActive: r.isActive,
      createdAt: r.createdAt,
      transactionCount: usage.find(u => u.packageId === r.id)?.transactions ?? 0,
      activeUsers: usage.find(u => u.packageId === r.id)?.active ?? 0
    }))
  }
})
