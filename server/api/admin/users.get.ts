import { and, count, desc, eq, gte, ilike, inArray, isNull, max, or, sql, type SQL } from 'drizzle-orm'
import { adminUsersQuery, likePattern } from '#shared/schemas/admin'

/**
 * Admin panel: paginated user list with basic account and activity facts.
 * Deliberately leaves out sensitive profile data (NIP, birth date, address,
 * phone) and all work content: support only needs who and how active.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = await getValidatedQuery(event, adminUsersQuery.parse)
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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [[totals], [{ total } = { total: 0 }], rows] = await Promise.all([
    db.select({
      all: count(),
      verified: sql<number>`count(*) filter (where ${u.emailVerified})`.mapWith(Number),
      onboarded: sql<number>`count(*) filter (where ${u.onboardingCompletedAt} is not null)`.mapWith(Number),
      newThisWeek: sql<number>`count(*) filter (where ${u.createdAt} >= ${weekAgo.toISOString()})`.mapWith(Number)
    }).from(u),
    db.select({ total: count() }).from(u).where(filtered),
    db.select({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      emailVerified: u.emailVerified,
      role: u.role,
      createdAt: u.createdAt,
      onboardingCompletedAt: u.onboardingCompletedAt,
      agency: schema.profiles.agency,
      positionTitle: schema.profiles.positionTitle
    }).from(u)
      .leftJoin(schema.profiles, eq(schema.profiles.userId, u.id))
      .where(filtered)
      .orderBy(desc(u.createdAt), desc(u.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)
  ])

  const ids = rows.map(r => r.id)
  const [lastSeen, providers, progress, rhkCounts] = ids.length
    ? await Promise.all([
        db.select({ userId: schema.sessions.userId, at: max(schema.sessions.updatedAt) }).from(schema.sessions)
          .where(inArray(schema.sessions.userId, ids)).groupBy(schema.sessions.userId),
        db.select({ userId: schema.accounts.userId, providerId: schema.accounts.providerId }).from(schema.accounts)
          .where(inArray(schema.accounts.userId, ids)),
        db.select({ userId: schema.dailyProgress.userId, n: count(), last: max(schema.dailyProgress.createdAt) }).from(schema.dailyProgress)
          .where(and(inArray(schema.dailyProgress.userId, ids), isNull(schema.dailyProgress.deletedAt))).groupBy(schema.dailyProgress.userId),
        db.select({ userId: schema.skps.userId, n: count() }).from(schema.rhks)
          .innerJoin(schema.skps, eq(schema.skps.id, schema.rhks.skpId))
          .where(and(inArray(schema.skps.userId, ids), isNull(schema.rhks.deletedAt))).groupBy(schema.skps.userId)
      ])
    : [[], [], [], []]

  const [{ active } = { active: 0 }] = await db.select({ active: sql<number>`count(distinct ${schema.sessions.userId})`.mapWith(Number) })
    .from(schema.sessions).where(gte(schema.sessions.updatedAt, weekAgo))

  return {
    stats: { total: totals?.all ?? 0, verified: totals?.verified ?? 0, onboarded: totals?.onboarded ?? 0, newThisWeek: totals?.newThisWeek ?? 0, activeThisWeek: active },
    total,
    page: query.page,
    pageSize: query.pageSize,
    users: rows.map(r => ({
      ...r,
      providers: [...new Set(providers.filter(p => p.userId === r.id).map(p => p.providerId))],
      lastSeenAt: lastSeen.find(s => s.userId === r.id)?.at ?? null,
      rhkCount: rhkCounts.find(x => x.userId === r.id)?.n ?? 0,
      progressCount: progress.find(x => x.userId === r.id)?.n ?? 0,
      lastProgressAt: progress.find(x => x.userId === r.id)?.last ?? null
    }))
  }
})
