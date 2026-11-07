import { and, count, desc, eq, ilike, or, sql, sum, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { adminTransactionsQuery, likePattern } from '#shared/schemas/admin'

/** Admin: transaction history with revenue numbers. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = await getValidatedQuery(event, adminTransactionsQuery.parse)
  const db = useDb()
  const t = schema.transactions
  const admin = alias(schema.users, 'admin')

  const where: SQL[] = []
  if (query.q) {
    const pattern = likePattern(query.q)
    where.push(or(ilike(t.userName, pattern), ilike(t.userEmail, pattern), ilike(t.packageName, pattern), ilike(t.reference, pattern))!)
  }
  if (query.method !== 'all') where.push(eq(t.method, query.method))
  if (query.userId) where.push(eq(t.userId, query.userId))
  const filtered = where.length ? and(...where) : undefined

  // Month boundaries in WIB, the business timezone.
  const today = todayInTimeZone('Asia/Jakarta')
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`).toISOString()
  const now = new Date().toISOString()

  const [[stats], [{ total } = { total: 0 }], rows] = await Promise.all([
    db.select({
      revenue: sum(t.amount).mapWith(Number),
      revenueThisMonth: sql<number>`coalesce(sum(${t.amount}) filter (where ${t.paidAt} >= ${monthStart}), 0)`.mapWith(Number),
      count: count(),
      activeUsers: sql<number>`count(distinct ${t.userId}) filter (where ${t.periodStart} <= ${now} and ${t.periodEnd} > ${now})`.mapWith(Number)
    }).from(t).where(eq(t.status, 'paid')),
    db.select({ total: count() }).from(t).where(filtered),
    db.select({
      id: t.id,
      userId: t.userId,
      userName: t.userName,
      userEmail: t.userEmail,
      packageName: t.packageName,
      durationDays: t.durationDays,
      amount: t.amount,
      method: t.method,
      status: t.status,
      periodStart: t.periodStart,
      periodEnd: t.periodEnd,
      reference: t.reference,
      notes: t.notes,
      paidAt: t.paidAt,
      createdAt: t.createdAt,
      createdByName: admin.name
    }).from(t)
      .leftJoin(admin, eq(admin.id, t.createdBy))
      .where(filtered)
      .orderBy(desc(t.createdAt), desc(t.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
  ])

  return {
    stats: { revenue: stats?.revenue ?? 0, revenueThisMonth: stats?.revenueThisMonth ?? 0, count: stats?.count ?? 0, activeUsers: stats?.activeUsers ?? 0 },
    total,
    page: query.page,
    pageSize: query.pageSize,
    transactions: rows
  }
})
