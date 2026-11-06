import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

/** RHK-02/03/05: one RHK with its plans for a period and related context. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const { rhk } = await requireOwnedRhk(user.id, id)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, getQuery(event).periodId)
  const db = useDb()

  const indicators = await db.select().from(schema.rhkIndicators).where(eq(schema.rhkIndicators.rhkId, rhk.id)).orderBy(schema.rhkIndicators.position)
  const plans = await listPlans([rhk.id], period.id, today)
  const planIds = plans.map(p => p.id)

  const recent = planIds.length
    ? await db.select({ progress: schema.dailyProgress, planName: schema.actionPlans.name })
        .from(schema.dailyProgress)
        .innerJoin(schema.actionPlans, eq(schema.actionPlans.id, schema.dailyProgress.actionPlanId))
        .where(and(inArray(schema.dailyProgress.actionPlanId, planIds), isNull(schema.dailyProgress.deletedAt)))
        .orderBy(desc(schema.dailyProgress.workDate), desc(schema.dailyProgress.startTime))
        .limit(5)
    : []
  const recentResults = recent.length
    ? await db.select().from(schema.progressResults).where(inArray(schema.progressResults.progressId, recent.map(r => r.progress.id)))
    : []

  const evidence = planIds.length
    ? await db.select({ id: schema.progressResults.id, name: schema.progressResults.name, url: schema.progressResults.evidenceUrl })
        .from(schema.progressResults)
        .innerJoin(schema.dailyProgress, eq(schema.dailyProgress.id, schema.progressResults.progressId))
        .where(and(inArray(schema.dailyProgress.actionPlanId, planIds), isNull(schema.dailyProgress.deletedAt), isNotNull(schema.progressResults.evidenceUrl)))
        .orderBy(desc(schema.dailyProgress.workDate))
        .limit(5)
    : []

  const previous = ws.periods.find(p => p.sequence === period.sequence - 1) ?? null

  return {
    rhk: { ...rhk, indicators },
    period,
    periods: ws.periods,
    currentPeriodId: ws.current.id,
    previousPeriod: previous,
    plans,
    stats: {
      plans: plans.length,
      done: plans.filter(p => p.status === 'selesai').length,
      progress: plans.reduce((n, p) => n + p.progressCount, 0),
      overdue: plans.filter(p => p.overdue).length,
      missingEvidence: plans.reduce((n, p) => n + p.missingEvidence, 0)
    },
    recentProgress: recent.map(r => ({
      id: r.progress.id,
      workDate: r.progress.workDate,
      startTime: r.progress.startTime,
      endTime: r.progress.endTime,
      description: r.progress.description,
      planName: r.planName,
      hasEvidence: recentResults.some(x => x.progressId === r.progress.id && x.evidenceUrl)
    })),
    evidence
  }
})
