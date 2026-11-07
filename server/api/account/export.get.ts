import { eq, inArray } from 'drizzle-orm'

/** PRD privacy: the user can export all their data (JSON). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const db = useDb()
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id))
  const [settings] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, user.id))
  const skps = await db.select().from(schema.skps).where(eq(schema.skps.userId, user.id))
  const skpIds = skps.map(s => s.id)
  const periods = skpIds.length ? await db.select().from(schema.evaluationPeriods).where(inArray(schema.evaluationPeriods.skpId, skpIds)) : []
  const rhks = skpIds.length ? await db.select().from(schema.rhks).where(inArray(schema.rhks.skpId, skpIds)) : []
  const rhkIds = rhks.map(r => r.id)
  const indicators = rhkIds.length ? await db.select().from(schema.rhkIndicators).where(inArray(schema.rhkIndicators.rhkId, rhkIds)) : []
  const plans = rhkIds.length ? await db.select().from(schema.actionPlans).where(inArray(schema.actionPlans.rhkId, rhkIds)) : []
  const progress = await db.select().from(schema.dailyProgress).where(eq(schema.dailyProgress.userId, user.id))
  const results = progress.length ? await db.select().from(schema.progressResults).where(inArray(schema.progressResults.progressId, progress.map(p => p.id))) : []
  const realizations = rhkIds.length ? await db.select().from(schema.periodRealizations).where(inArray(schema.periodRealizations.rhkId, rhkIds)) : []

  setResponseHeaders(event, {
    'content-type': 'application/json; charset=utf-8',
    'content-disposition': `attachment; filename="ruangkerja-data-${todayInTimeZone(user.timezone)}.json"`,
    'cache-control': 'no-store'
  })
  return {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, timezone: user.timezone },
    profile: profile ?? null,
    settings: settings ?? null,
    skps,
    periods,
    rhks,
    indicators,
    actionPlans: plans,
    dailyProgress: progress,
    progressResults: results,
    realizations
  }
})
