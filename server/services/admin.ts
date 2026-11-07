import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { likePattern } from '#shared/schemas/admin'

type UsersQuery = ReturnType<typeof import('#shared/schemas/admin').adminUsersQuery.parse>
type TransactionsQuery = ReturnType<typeof import('#shared/schemas/admin').adminTransactionsQuery.parse>

/** The business timezone; a constant written into the SQL (not a bind parameter). */
const TZ = 'Asia/Jakarta'
const tz = sql.raw(`'${TZ}'`)

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Paginated user list with account and activity facts. Leaves out sensitive
 * profile data (NIP, birth date, address, phone) and all work content.
 * Two queries: the headline numbers (one scan of users) and the page with
 * its relations (profile, login providers, paid coverage) and activity extras.
 */
export async function listUsers(query: UsersQuery, now = new Date()) {
  const db = useDb()
  const u = schema.users

  const where: SQL[] = []
  if (query.q) {
    const pattern = likePattern(query.q)
    where.push(or(ilike(u.name, pattern), ilike(u.email, pattern))!)
  }
  if (query.filter === 'unverified') where.push(eq(u.emailVerified, false))
  if (query.filter === 'not_onboarded') where.push(isNull(u.onboardingCompletedAt))
  if (query.filter === 'admin') where.push(eq(u.role, 'admin'))
  const filtered = where.length ? and(...where) : undefined
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString()

  const [stats] = await db.select({
    all: count(),
    total: filtered ? sql<number>`count(*) filter (where ${filtered})`.mapWith(Number) : count(),
    verified: sql<number>`count(*) filter (where ${u.emailVerified})`.mapWith(Number),
    onboarded: sql<number>`count(*) filter (where ${u.onboardingCompletedAt} is not null)`.mapWith(Number),
    newThisWeek: sql<number>`count(*) filter (where ${u.createdAt} >= ${weekAgo})`.mapWith(Number),
    activeThisWeek: sql<number>`(select count(distinct s.user_id) from sessions s where s.updated_at >= ${weekAgo})`.mapWith(Number)
  }).from(u)

  const rows = await db.query.users.findMany({
    where: filtered,
    orderBy: [desc(u.createdAt), desc(u.id)],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
    columns: { id: true, name: true, email: true, image: true, emailVerified: true, role: true, createdAt: true, onboardingCompletedAt: true },
    extras: x => ({
      lastSeenAt: sql<Date | null>`(select max(s.updated_at) from sessions s where s.user_id = ${x.id})`.as('last_seen_at'),
      progressCount: sql<number>`(select count(*)::int from daily_progress dp where dp.user_id = ${x.id} and dp.deleted_at is null)`.as('progress_count'),
      lastProgressAt: sql<Date | null>`(select max(dp.created_at) from daily_progress dp where dp.user_id = ${x.id} and dp.deleted_at is null)`.as('last_progress_at'),
      rhkCount: sql<number>`(select count(*)::int from rhks r join skps s on s.id = r.skp_id where s.user_id = ${x.id} and r.deleted_at is null)`.as('rhk_count')
    }),
    with: {
      profile: { columns: { agency: true, positionTitle: true } },
      accounts: { columns: { providerId: true } },
      transactions: paidCoverage(now)
    }
  })

  return {
    stats: {
      total: stats?.all ?? 0,
      verified: stats?.verified ?? 0,
      onboarded: stats?.onboarded ?? 0,
      newThisWeek: stats?.newThisWeek ?? 0,
      activeThisWeek: stats?.activeThisWeek ?? 0
    },
    total: stats?.total ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    users: rows.map(({ profile, accounts, transactions, ...r }) => ({
      ...r,
      agency: profile?.agency ?? null,
      positionTitle: profile?.positionTitle ?? null,
      providers: [...new Set(accounts.map(a => a.providerId))],
      progressCount: Number(r.progressCount),
      rhkCount: Number(r.rhkCount),
      lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt) : null,
      lastProgressAt: r.lastProgressAt ? new Date(r.lastProgressAt) : null,
      activePackage: pickActivePackage(transactions, now)
    }))
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

interface DashboardRow {
  totalUsers: number
  newUsers: number
  onboarded: number
  activeUsers7d: number
  revenue: number
  transactions: number
  revenueThisMonth: number
  subscribers: number
  signups: { day: string, n: number }[]
  revenueByDay: { day: string, amount: number, n: number }[]
  packages: { name: string, users: number }[]
  recentTransactions: { id: string, userName: string, packageName: string, amount: number, method: string, paidAt: string | null }[]
  recentSignups: { id: string, name: string, email: string, createdAt: string, onboarded: boolean }[]
  expiringSoon: { userId: string, name: string, email: string, until: string }[]
}

/**
 * Admin dashboard: headline numbers, daily sign-ups and revenue for the
 * chosen range (days in WIB), active packages and short recent lists — one
 * statement (scalar subqueries and json_agg lists, one scan of paid
 * transactions for the revenue numbers).
 */
export async function getAdminDashboard(days: number, now = new Date()) {
  const today = todayInTimeZone(TZ, now)
  const firstDay = addDays(today, -(days - 1))
  const rangeStart = new Date(`${firstDay}T00:00:00+07:00`).toISOString()
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString()
  const inWeek = new Date(now.getTime() + 7 * DAY_MS).toISOString()
  const nowIso = now.toISOString()

  const [row] = await useDb().execute<DashboardRow & Record<string, unknown>>(sql`
    select
      (select count(*) from users)::int as "totalUsers",
      (select count(*) from users where created_at >= ${rangeStart})::int as "newUsers",
      (select count(*) from users where onboarding_completed_at is not null)::int as "onboarded",
      (select count(distinct user_id) from sessions where updated_at >= ${weekAgo})::int as "activeUsers7d",
      paid.revenue::float8 as "revenue",
      paid.transactions::int as "transactions",
      paid.this_month::float8 as "revenueThisMonth",
      paid.subscribers::int as "subscribers",
      (select coalesce(json_agg(x order by x.day), '[]') from (
        select to_char(created_at at time zone ${tz}, 'YYYY-MM-DD') as day, count(*)::int as n
        from users where created_at >= ${rangeStart} group by 1
      ) x) as "signups",
      (select coalesce(json_agg(x order by x.day), '[]') from (
        select to_char(paid_at at time zone ${tz}, 'YYYY-MM-DD') as day, sum(amount)::float8 as amount, count(*)::int as n
        from transactions where status = 'paid' and paid_at >= ${rangeStart} group by 1
      ) x) as "revenueByDay",
      (select coalesce(json_agg(x order by x.users desc, x.name), '[]') from (
        select package_name as name, count(distinct user_id)::int as users
        from transactions where status = 'paid' and period_start <= ${nowIso} and period_end > ${nowIso}
        group by package_name
      ) x) as "packages",
      (select coalesce(json_agg(x order by x."paidAt" desc), '[]') from (
        select id, user_name as "userName", package_name as "packageName", amount, method, paid_at as "paidAt"
        from transactions where status = 'paid' order by paid_at desc limit 5
      ) x) as "recentTransactions",
      (select coalesce(json_agg(x order by x."createdAt" desc), '[]') from (
        select id, name, email, created_at as "createdAt", onboarding_completed_at is not null as onboarded
        from users order by created_at desc limit 5
      ) x) as "recentSignups",
      (select coalesce(json_agg(x order by x.until), '[]') from (
        select user_id as "userId", max(user_name) as name, max(user_email) as email, max(period_end) as until
        from transactions where status = 'paid' and period_end > ${nowIso} and user_id is not null
        group by user_id having max(period_end) <= ${inWeek}
        order by max(period_end) limit 5
      ) x) as "expiringSoon"
    from (
      select
        coalesce(sum(amount) filter (where paid_at >= ${rangeStart}), 0) as revenue,
        count(*) filter (where paid_at >= ${rangeStart}) as transactions,
        coalesce(sum(amount) filter (where paid_at >= ${monthStart}), 0) as this_month,
        count(distinct user_id) filter (where period_start <= ${nowIso} and period_end > ${nowIso}) as subscribers
      from transactions where status = 'paid'
    ) paid
  `)
  const d = row!

  const series = Array.from({ length: days }, (_, i) => {
    const day = addDays(firstDay, i)
    const r = d.revenueByDay.find(x => x.day === day)
    return { day, signups: d.signups.find(x => x.day === day)?.n ?? 0, revenue: r?.amount ?? 0, transactions: r?.n ?? 0 }
  })

  return {
    days,
    today,
    kpis: {
      totalUsers: d.totalUsers,
      newUsers: d.newUsers,
      onboarded: d.onboarded,
      activeUsers7d: d.activeUsers7d,
      subscribers: d.subscribers,
      revenue: d.revenue,
      transactions: d.transactions,
      revenueThisMonth: d.revenueThisMonth
    },
    series,
    packages: d.packages,
    recentTransactions: d.recentTransactions,
    recentSignups: d.recentSignups,
    expiringSoon: d.expiringSoon
  }
}

// ---------------------------------------------------------------------------
// Transactions and packages
// ---------------------------------------------------------------------------

interface TransactionRow {
  id: string
  code: string | null
  userId: string | null
  userName: string
  userEmail: string
  packageName: string
  durationDays: number
  amount: number
  method: 'manual' | 'singapay'
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  periodStart: string | null
  periodEnd: string | null
  reference: string | null
  notes: string | null
  paidAt: string | null
  createdAt: string
  createdByName: string | null
}

interface TransactionsResult {
  revenue: number
  revenueThisMonth: number
  count: number
  activeUsers: number
  pending: number
  total: number
  transactions: TransactionRow[]
}

/**
 * Transaction history with revenue numbers in one statement: the page (with
 * the recording admin's name) is a CTE aggregated with json_agg, and every
 * number comes from one scan of transactions. One round trip, no parallel
 * queries.
 */
export async function listTransactions(query: TransactionsQuery, now = new Date()) {
  const t = schema.transactions

  const where: SQL[] = []
  if (query.q) {
    const pattern = likePattern(query.q)
    where.push(or(ilike(t.userName, pattern), ilike(t.userEmail, pattern), ilike(t.packageName, pattern), ilike(t.reference, pattern), ilike(t.code, pattern))!)
  }
  if (query.method !== 'all') where.push(eq(t.method, query.method))
  if (query.status !== 'all') where.push(eq(t.status, query.status))
  if (query.userId) where.push(eq(t.userId, query.userId))
  // Rendered with the table name ("transactions"."user_name"), so the SQL
  // below keeps the transactions table unaliased.
  const filtered = where.length ? and(...where)! : sql`true`

  // Month boundaries in WIB, the business timezone.
  const monthStart = new Date(`${todayInTimeZone(TZ, now).slice(0, 7)}-01T00:00:00+07:00`).toISOString()
  const nowIso = now.toISOString()

  const [row] = await useDb().execute<TransactionsResult & Record<string, unknown>>(sql`
    with page as (
      select transactions.id, transactions.code, transactions.user_id as "userId", transactions.user_name as "userName",
        transactions.user_email as "userEmail", transactions.package_name as "packageName", transactions.duration_days as "durationDays",
        transactions.amount, transactions.method, transactions.status, transactions.period_start as "periodStart",
        transactions.period_end as "periodEnd", transactions.reference, transactions.notes, transactions.paid_at as "paidAt",
        transactions.created_at as "createdAt", admin.name as "createdByName"
      from transactions
      left join users admin on admin.id = transactions.created_by
      where ${filtered}
      order by transactions.created_at desc, transactions.id desc
      limit ${query.pageSize} offset ${(query.page - 1) * query.pageSize}
    )
    select
      coalesce(sum(amount) filter (where status = 'paid'), 0)::float8 as "revenue",
      coalesce(sum(amount) filter (where status = 'paid' and paid_at >= ${monthStart}), 0)::float8 as "revenueThisMonth",
      (count(*) filter (where status = 'paid'))::int as "count",
      (count(distinct user_id) filter (where status = 'paid' and period_start <= ${nowIso} and period_end > ${nowIso}))::int as "activeUsers",
      (count(*) filter (where status = 'pending'))::int as "pending",
      (count(*) filter (where ${filtered}))::int as "total",
      (select coalesce(json_agg(p order by p."createdAt" desc, p.id desc), '[]') from page p) as "transactions"
    from transactions
  `)
  const d = row!
  const date = (v: string | null) => (v ? new Date(v) : null)

  return {
    stats: { revenue: d.revenue, revenueThisMonth: d.revenueThisMonth, count: d.count, activeUsers: d.activeUsers, pending: d.pending },
    total: d.total,
    page: query.page,
    pageSize: query.pageSize,
    transactions: d.transactions.map(r => ({
      ...r,
      periodStart: date(r.periodStart),
      periodEnd: date(r.periodEnd),
      paidAt: date(r.paidAt),
      createdAt: new Date(r.createdAt)
    }))
  }
}

/**
 * All packages (archived ones excluded) with usage numbers, in one query:
 * usage is aggregated per package in a subquery and left-joined (Drizzle
 * qualifies joined columns; a correlated subquery in a single-table SELECT
 * list would see an unqualified "id").
 */
export async function listPackages(now = new Date()) {
  const db = useDb()
  const p = schema.packages
  const t = schema.transactions
  const nowIso = now.toISOString()
  const usage = db.select({
    packageId: t.packageId,
    transactionCount: sql<number>`count(*)::int`.as('transaction_count'),
    activeUsers: sql<number>`(count(distinct ${t.userId}) filter (where ${t.status} = 'paid' and ${t.periodStart} <= ${nowIso} and ${t.periodEnd} > ${nowIso}))::int`.as('active_users')
  }).from(t).where(isNotNull(t.packageId)).groupBy(t.packageId).as('usage')

  return db.select({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    durationDays: p.durationDays,
    isActive: p.isActive,
    createdAt: p.createdAt,
    transactionCount: sql<number>`coalesce(${usage.transactionCount}, 0)`.mapWith(Number),
    activeUsers: sql<number>`coalesce(${usage.activeUsers}, 0)`.mapWith(Number)
  }).from(p)
    .leftJoin(usage, eq(usage.packageId, p.id))
    .where(isNull(p.deletedAt))
    .orderBy(asc(p.price), asc(p.createdAt))
}
