import { and, count, desc, eq, gt, gte, isNotNull, lte, sql } from 'drizzle-orm'
import { adminDashboardQuery } from '#shared/schemas/admin'

const TZ = 'Asia/Jakarta'

/**
 * Admin dashboard: headline numbers, daily sign-ups and revenue for the
 * chosen range (days in WIB), active packages, and short recent lists.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { days } = await getValidatedQuery(event, adminDashboardQuery.parse)
  const db = useDb()
  const u = schema.users
  const t = schema.transactions

  const now = new Date()
  const today = todayInTimeZone(TZ)
  const firstDay = addDays(today, -(days - 1))
  const rangeStart = new Date(`${firstDay}T00:00:00+07:00`)
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const iso = (d: Date) => d.toISOString()
  // The zone is a constant written into the SQL (not a bind parameter) so the
  // SELECT and GROUP BY expressions are identical to Postgres.
  const localDay = (col: typeof u.createdAt | typeof t.paidAt) => sql<string>`to_char(${col} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`

  const [
    [users],
    [{ active7 } = { active7: 0 }],
    [revenue],
    signupRows,
    revenueRows,
    packageRows,
    recentTransactions,
    recentSignups,
    coverage
  ] = await Promise.all([
    db.select({
      total: count(),
      newInRange: sql<number>`count(*) filter (where ${u.createdAt} >= ${iso(rangeStart)})`.mapWith(Number),
      onboarded: sql<number>`count(*) filter (where ${u.onboardingCompletedAt} is not null)`.mapWith(Number)
    }).from(u),
    db.select({ active7: sql<number>`count(distinct ${schema.sessions.userId})`.mapWith(Number) })
      .from(schema.sessions).where(gte(schema.sessions.updatedAt, weekAgo)),
    db.select({
      inRange: sql<number>`coalesce(sum(${t.amount}) filter (where ${t.paidAt} >= ${iso(rangeStart)}), 0)`.mapWith(Number),
      txInRange: sql<number>`count(*) filter (where ${t.paidAt} >= ${iso(rangeStart)})`.mapWith(Number),
      thisMonth: sql<number>`coalesce(sum(${t.amount}) filter (where ${t.paidAt} >= ${iso(monthStart)}), 0)`.mapWith(Number),
      subscribers: sql<number>`count(distinct ${t.userId}) filter (where ${t.periodStart} <= ${iso(now)} and ${t.periodEnd} > ${iso(now)})`.mapWith(Number)
    }).from(t).where(eq(t.status, 'paid')),
    db.select({ day: localDay(u.createdAt), n: count() }).from(u)
      .where(gte(u.createdAt, rangeStart)).groupBy(localDay(u.createdAt)),
    db.select({ day: localDay(t.paidAt), amount: sql<number>`sum(${t.amount})`.mapWith(Number), n: count() }).from(t)
      .where(and(eq(t.status, 'paid'), gte(t.paidAt, rangeStart))).groupBy(localDay(t.paidAt)),
    db.select({ name: t.packageName, users: sql<number>`count(distinct ${t.userId})`.mapWith(Number) }).from(t)
      .where(and(eq(t.status, 'paid'), lte(t.periodStart, now), gt(t.periodEnd, now)))
      .groupBy(t.packageName).orderBy(desc(sql`count(distinct ${t.userId})`)),
    db.select({ id: t.id, userName: t.userName, packageName: t.packageName, amount: t.amount, method: t.method, paidAt: t.paidAt })
      .from(t).where(eq(t.status, 'paid')).orderBy(desc(t.paidAt)).limit(5),
    db.select({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, onboarded: isNotNull(u.onboardingCompletedAt) })
      .from(u).orderBy(desc(u.createdAt)).limit(5),
    // Paid coverage per user that ends within 7 days (no later renewal queued).
    db.select({ userId: t.userId, name: sql<string>`max(${t.userName})`, email: sql<string>`max(${t.userEmail})`, until: sql<string>`max(${t.periodEnd})` })
      .from(t).where(and(eq(t.status, 'paid'), gt(t.periodEnd, now), isNotNull(t.userId)))
      .groupBy(t.userId)
      .having(sql`max(${t.periodEnd}) <= ${iso(inWeek)}`)
      .orderBy(sql`max(${t.periodEnd})`)
      .limit(5)
  ])

  const series = Array.from({ length: days }, (_, i) => {
    const day = addDays(firstDay, i)
    const r = revenueRows.find(x => x.day === day)
    return { day, signups: signupRows.find(x => x.day === day)?.n ?? 0, revenue: r?.amount ?? 0, transactions: r?.n ?? 0 }
  })

  return {
    days,
    today,
    kpis: {
      totalUsers: users?.total ?? 0,
      newUsers: users?.newInRange ?? 0,
      onboarded: users?.onboarded ?? 0,
      activeUsers7d: active7,
      subscribers: revenue?.subscribers ?? 0,
      revenue: revenue?.inRange ?? 0,
      transactions: revenue?.txInRange ?? 0,
      revenueThisMonth: revenue?.thisMonth ?? 0
    },
    series,
    packages: packageRows,
    recentTransactions,
    recentSignups,
    expiringSoon: coverage.map(c => ({ userId: c.userId!, name: c.name, email: c.email, until: c.until }))
  }
})
