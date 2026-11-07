import { and, eq, isNull, sql } from 'drizzle-orm'

type ActionPlanInput = ReturnType<typeof import('#shared/schemas/workspace').actionPlanSchema.parse>
type ActionPlanUpdate = ReturnType<typeof import('#shared/schemas/workspace').actionPlanUpdateSchema.parse>

/** PRG-07: one plan with its RHK, period, derived values and previous progress (one query). */
export async function getActionPlanDetail(userId: string, planId: string, today: string) {
  const ap = schema.actionPlans
  const row = await useDb().query.actionPlans.findFirst({
    where: and(eq(ap.id, planId), ownsActionPlan(userId, ap.id)),
    extras: planStatsExtras,
    with: {
      rhk: { columns: { id: true, number: true, statement: true } },
      period: true,
      progress: {
        where: (p, { isNull }) => isNull(p.deletedAt),
        orderBy: (p, { desc }) => [desc(p.workDate), desc(p.startTime)],
        columns: { id: true, workDate: true, startTime: true, endTime: true, description: true, realization: true },
        with: { results: { columns: { evidenceUrl: true } } }
      }
    }
  })
  if (!row) {
    notFound('Rencana aksi')
  }
  const { rhk, period, progress, ...plan } = row
  return {
    plan: withPlanStats(plan, today),
    rhk,
    period,
    previous: progress.map(({ results, ...p }) => ({ ...p, evidenceCount: results.filter(r => r.evidenceUrl).length }))
  }
}

/** Create a plan at the end of its RHK × period list. RHK and period must be the user's and share an SKP. */
export async function createActionPlan(userId: string, input: ActionPlanInput) {
  const db = useDb()
  const r = schema.rhks
  const s = schema.skps
  const p = schema.evaluationPeriods
  const [owned] = await db.select({ skpId: r.skpId, periodSkpId: p.skpId })
    .from(r)
    .innerJoin(s, eq(s.id, r.skpId))
    .leftJoin(p, and(eq(p.id, input.periodId), sql`${p.skpId} in (select id from skps where user_id = ${userId})`))
    .where(and(eq(r.id, input.rhkId), isNull(r.deletedAt), eq(s.userId, userId)))
  if (!owned) notFound('RHK')
  if (!owned.periodSkpId) notFound('Periode')
  if (owned.periodSkpId !== owned.skpId) {
    throw createError({ statusCode: 422, statusMessage: 'Periode tidak sesuai dengan SKP RHK ini' })
  }
  const ap = schema.actionPlans
  const [plan] = await db.insert(ap).values({
    ...input,
    position: sql`(select coalesce(max(${ap.position}), -1) + 1 from ${ap} where ${ap.rhkId} = ${input.rhkId} and ${ap.periodId} = ${input.periodId})`
  }).returning()
  return plan!
}

/**
 * RHK-03 "Salin dari periode sebelumnya": copy the live plans of one RHK to
 * another period of the same SKP, reset to Belum dimulai, due date moved to
 * the same offset in the target period (clamped to its end).
 */
export async function copyActionPlans(userId: string, input: { rhkId: string, fromPeriodId: string, toPeriodId: string }) {
  const db = useDb()
  const rhk = await db.query.rhks.findFirst({
    where: and(eq(schema.rhks.id, input.rhkId), ownsRhk(userId, schema.rhks.id)),
    columns: { id: true },
    with: {
      skp: { columns: { id: true }, with: { periods: { where: (p, { inArray }) => inArray(p.id, [input.fromPeriodId, input.toPeriodId]) } } },
      actionPlans: {
        where: (p, { and, eq, isNull }) => and(eq(p.periodId, input.fromPeriodId), isNull(p.deletedAt)),
        orderBy: (p, { asc }) => [asc(p.position)]
      }
    }
  })
  if (!rhk) notFound('RHK')
  const from = rhk.skp.periods.find(p => p.id === input.fromPeriodId)
  const to = rhk.skp.periods.find(p => p.id === input.toPeriodId)
  if (!from || !to || from.id === to.id) {
    throw createError({ statusCode: 422, statusMessage: 'Periode tidak valid' })
  }
  if (!rhk.actionPlans.length) {
    throw createError({ statusCode: 404, statusMessage: 'Tidak ada rencana aksi di periode sebelumnya' })
  }
  const shift = (due: string) => {
    const moved = addDays(to.startDate, Math.max(0, daysBetween(from.startDate, due)))
    return moved > to.endDate ? to.endDate : moved
  }
  const created = await db.insert(schema.actionPlans).values(rhk.actionPlans.map((p, i) => ({
    rhkId: p.rhkId,
    periodId: to.id,
    name: p.name,
    target: p.target,
    unit: p.unit,
    dueDate: shift(p.dueDate),
    copiedFromId: p.id,
    position: i
  }))).returning({ id: schema.actionPlans.id })
  return created.length
}

/** Edit a plan the user owns (one statement). Setting Selesai keeps an existing completion date. */
export async function updateActionPlan(userId: string, planId: string, input: ActionPlanUpdate) {
  const ap = schema.actionPlans
  const completedAt = input.status === undefined
    ? undefined
    : input.status === 'selesai' ? sql`coalesce(${ap.completedAt}, now())` : null
  const [row] = await useDb().update(ap)
    .set({ ...input, ...(completedAt !== undefined ? { completedAt } : {}) })
    .where(and(eq(ap.id, planId), ownsActionPlan(userId, ap.id)))
    .returning()
  if (!row) notFound('Rencana aksi')
  return row
}

/** Soft delete; its progress is hidden with it (reads require a live plan). */
export async function deleteActionPlan(userId: string, planId: string) {
  const ap = schema.actionPlans
  const [row] = await useDb().update(ap).set({ deletedAt: new Date() })
    .where(and(eq(ap.id, planId), ownsActionPlan(userId, ap.id)))
    .returning({ id: ap.id })
  if (!row) notFound('Rencana aksi')
}
