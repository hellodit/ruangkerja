import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

/** PRG-07: plan details for the side panel of the progress form. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const { plan, rhk } = await requireOwnedActionPlan(user.id, id)
  const db = useDb()
  const [period] = await db.select().from(schema.evaluationPeriods).where(eq(schema.evaluationPeriods.id, plan.periodId))
  const stats = (await planStats([plan.id])).get(plan.id) ?? { realization: 0, progressCount: 0, missingEvidence: 0 }
  const previous = await db.select().from(schema.dailyProgress)
    .where(and(eq(schema.dailyProgress.actionPlanId, plan.id), isNull(schema.dailyProgress.deletedAt)))
    .orderBy(desc(schema.dailyProgress.workDate), desc(schema.dailyProgress.startTime))
  const results = previous.length
    ? await db.select().from(schema.progressResults).where(inArray(schema.progressResults.progressId, previous.map(p => p.id)))
    : []
  return {
    plan: { ...plan, ...stats, overdue: isOverdue(plan, today), achievement: achievementPercent(stats.realization, plan.target) },
    rhk: { id: rhk.id, number: rhk.number, statement: rhk.statement },
    period,
    previous: previous.map(p => ({
      id: p.id,
      workDate: p.workDate,
      startTime: p.startTime,
      endTime: p.endTime,
      description: p.description,
      realization: p.realization,
      evidenceCount: results.filter(r => r.progressId === p.id && r.evidenceUrl).length
    }))
  }
})
