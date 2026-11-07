import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

type RhkInput = ReturnType<typeof import('#shared/schemas/workspace').rhkSchema.parse>
type RhkBulkInput = ReturnType<typeof import('#shared/schemas/workspace').rhkBulkSchema.parse>

/** Next RHK number of an SKP, computed inside the INSERT. */
const nextRhkNumber = (skpId: string, offset = 0) =>
  sql<number>`(select coalesce(max(${schema.rhks.number}), 0) + ${offset + 1} from ${schema.rhks} where ${schema.rhks.skpId} = ${skpId})`

/**
 * RHK-02/03/05: one RHK with its indicators and the plans of a period, the
 * five latest progress entries and evidence links of those plans.
 */
export async function getRhkDetail(userId: string, rhkId: string, today: string, periodId: unknown) {
  const db = useDb()
  const ws = await requireWorkspace(userId, today)
  const period = pickPeriod(ws, periodId)

  const row = await db.query.rhks.findFirst({
    where: and(eq(schema.rhks.id, rhkId), ownsRhk(userId, schema.rhks.id)),
    with: {
      indicators: { orderBy: (i, { asc }) => [asc(i.position)] },
      actionPlans: livePlansIn(period.id)
    }
  })
  if (!row) notFound('RHK')
  const { actionPlans, ...rhk } = row
  const plans = actionPlans.map(p => withPlanStats(p, today))
  const planIds = plans.map(p => p.id)

  const dp = schema.dailyProgress
  const recent = planIds.length
    ? await db.query.dailyProgress.findMany({
        where: and(inArray(dp.actionPlanId, planIds), isNull(dp.deletedAt)),
        orderBy: [desc(dp.workDate), desc(dp.startTime)],
        limit: 5,
        columns: { id: true, workDate: true, startTime: true, endTime: true, description: true },
        with: { actionPlan: { columns: { name: true } }, results: { columns: { evidenceUrl: true } } }
      })
    : []
  // Ordered by the parent progress's date: a join, not a relational query.
  const evidence = planIds.length
    ? await db.select({ id: schema.progressResults.id, name: schema.progressResults.name, url: schema.progressResults.evidenceUrl })
        .from(schema.progressResults)
        .innerJoin(dp, eq(dp.id, schema.progressResults.progressId))
        .where(and(inArray(dp.actionPlanId, planIds), isNull(dp.deletedAt), isNotNull(schema.progressResults.evidenceUrl)))
        .orderBy(desc(dp.workDate))
        .limit(5)
    : []

  return {
    rhk,
    period,
    periods: ws.periods,
    currentPeriodId: ws.current.id,
    previousPeriod: ws.periods.find(p => p.sequence === period.sequence - 1) ?? null,
    plans,
    stats: {
      plans: plans.length,
      done: plans.filter(p => p.status === 'selesai').length,
      progress: plans.reduce((n, p) => n + p.progressCount, 0),
      overdue: plans.filter(p => p.overdue).length,
      missingEvidence: plans.reduce((n, p) => n + p.missingEvidence, 0)
    },
    recentProgress: recent.map(r => ({
      id: r.id,
      workDate: r.workDate,
      startTime: r.startTime,
      endTime: r.endTime,
      description: r.description,
      planName: r.actionPlan.name,
      hasEvidence: r.results.some(x => x.evidenceUrl)
    })),
    evidence
  }
}

function requireSkp<T>(skp: T | null): T {
  if (!skp) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi terlebih dahulu' })
  }
  return skp
}

/** Add an RHK (next number) with its indicators to the active SKP. */
export async function createRhk(userId: string, today: string, input: RhkInput) {
  const skp = requireSkp(await findActiveSkp(userId, today))
  return useDb().transaction(async (tx) => {
    const [row] = await tx.insert(schema.rhks).values({
      skpId: skp.id,
      number: nextRhkNumber(skp.id),
      type: input.type,
      statement: input.statement,
      supervisorRhk: input.supervisorRhk ?? null
    }).returning()
    await tx.insert(schema.rhkIndicators).values(input.indicators.map((ind, i) => ({ ...ind, rhkId: row!.id, position: i })))
    return row!
  })
}

/** Paste several RHK statements copied from an approved SKP (one per line). */
export async function createRhksBulk(userId: string, today: string, input: RhkBulkInput) {
  const skp = requireSkp(await findActiveSkp(userId, today))
  const created = await useDb().insert(schema.rhks).values(input.statements.map((statement, i) => ({
    skpId: skp.id,
    number: nextRhkNumber(skp.id, i),
    type: input.type,
    statement
  }))).returning({ id: schema.rhks.id })
  return created.length
}

/** RHK-06: edit anytime (never changes the official SKP). Indicators are replaced. */
export async function updateRhk(userId: string, rhkId: string, input: RhkInput) {
  await useDb().transaction(async (tx) => {
    const [row] = await tx.update(schema.rhks)
      .set({ statement: input.statement, type: input.type, supervisorRhk: input.supervisorRhk ?? null })
      .where(and(eq(schema.rhks.id, rhkId), ownsRhk(userId, schema.rhks.id)))
      .returning({ id: schema.rhks.id })
    if (!row) notFound('RHK')
    await tx.delete(schema.rhkIndicators).where(eq(schema.rhkIndicators.rhkId, rhkId))
    await tx.insert(schema.rhkIndicators).values(input.indicators.map((ind, i) => ({ ...ind, rhkId, position: i })))
  })
}

/** Soft delete: its plans and progress disappear from every view but stay recoverable. */
export async function deleteRhk(userId: string, rhkId: string) {
  const [row] = await useDb().update(schema.rhks).set({ deletedAt: new Date() })
    .where(and(eq(schema.rhks.id, rhkId), ownsRhk(userId, schema.rhks.id)))
    .returning({ id: schema.rhks.id })
  if (!row) notFound('RHK')
}
