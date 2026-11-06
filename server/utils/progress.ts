import { and, asc, desc, eq, gte, inArray, isNull, lte, type SQL } from 'drizzle-orm'

export interface ProgressFilters {
  from?: string
  to?: string
  rhkId?: string
  actionPlanId?: string
  ids?: string[]
  order?: 'asc' | 'desc'
}

/**
 * Progress entries of one user with their plan, RHK and results. Entries under
 * a soft-deleted plan or RHK are excluded.
 */
export async function loadProgress(userId: string, f: ProgressFilters = {}) {
  const db = useDb()
  const where: SQL[] = [
    eq(schema.dailyProgress.userId, userId),
    isNull(schema.dailyProgress.deletedAt),
    isNull(schema.actionPlans.deletedAt),
    isNull(schema.rhks.deletedAt)
  ]
  if (f.from) {
    where.push(gte(schema.dailyProgress.workDate, f.from))
  }
  if (f.to) {
    where.push(lte(schema.dailyProgress.workDate, f.to))
  }
  if (f.rhkId) {
    where.push(eq(schema.rhks.id, f.rhkId))
  }
  if (f.actionPlanId) {
    where.push(eq(schema.dailyProgress.actionPlanId, f.actionPlanId))
  }
  if (f.ids) {
    if (!f.ids.length) {
      return []
    }
    where.push(inArray(schema.dailyProgress.id, f.ids))
  }
  const dir = f.order === 'asc' ? asc : desc
  const rows = await db.select({
    progress: schema.dailyProgress,
    plan: { id: schema.actionPlans.id, name: schema.actionPlans.name, unit: schema.actionPlans.unit, target: schema.actionPlans.target, periodId: schema.actionPlans.periodId },
    rhk: { id: schema.rhks.id, number: schema.rhks.number, statement: schema.rhks.statement }
  }).from(schema.dailyProgress)
    .innerJoin(schema.actionPlans, eq(schema.actionPlans.id, schema.dailyProgress.actionPlanId))
    .innerJoin(schema.rhks, eq(schema.rhks.id, schema.actionPlans.rhkId))
    .where(and(...where))
    .orderBy(dir(schema.dailyProgress.workDate), dir(schema.dailyProgress.startTime))

  const results = rows.length
    ? await db.select().from(schema.progressResults)
        .where(inArray(schema.progressResults.progressId, rows.map(r => r.progress.id)))
        .orderBy(asc(schema.progressResults.position))
    : []

  return rows.map(r => ({
    ...r.progress,
    startTime: r.progress.startTime.slice(0, 5),
    endTime: r.progress.endTime.slice(0, 5),
    plan: r.plan,
    rhk: r.rhk,
    results: results.filter(x => x.progressId === r.progress.id),
    hasEvidence: results.some(x => x.progressId === r.progress.id && !!x.evidenceUrl)
  }))
}

export type ProgressEntry = Awaited<ReturnType<typeof loadProgress>>[number]

export function toEkinerjaEntry(p: ProgressEntry): EkinerjaEntry {
  return {
    actionPlan: p.plan.name,
    workDate: p.workDate,
    startTime: p.startTime,
    endTime: p.endTime,
    description: p.description,
    realization: p.realization,
    unit: p.plan.unit,
    evidenceUrls: p.results.map(r => r.evidenceUrl).filter((u): u is string => !!u)
  }
}

type ProgressPayload = ReturnType<typeof import('#shared/schemas/workspace').progressSchema.parse>

/** Insert or replace a progress entry with its results; then sync plan status. */
export async function saveProgress(userId: string, id: string | null, input: ProgressPayload) {
  const db = useDb()
  const values = {
    actionPlanId: input.actionPlanId,
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
    description: input.description,
    descriptionRaw: input.descriptionRaw ?? null,
    inputMethod: input.inputMethod,
    realization: input.realization,
    category: input.category,
    marksPlanComplete: input.marksPlanComplete
  }
  const progressId = await db.transaction(async (tx) => {
    let pid = id
    if (pid) {
      await tx.update(schema.dailyProgress).set(values).where(and(eq(schema.dailyProgress.id, pid), eq(schema.dailyProgress.userId, userId)))
      await tx.delete(schema.progressResults).where(eq(schema.progressResults.progressId, pid))
    } else {
      const [row] = await tx.insert(schema.dailyProgress).values({ ...values, userId }).returning({ id: schema.dailyProgress.id })
      pid = row!.id
    }
    if (input.results.length) {
      await tx.insert(schema.progressResults).values(input.results.map((r, i) => ({
        progressId: pid!,
        name: r.name,
        evidenceUrl: r.evidenceUrl ?? null,
        position: i
      })))
    }
    return pid!
  })
  await syncPlanStatus(input.actionPlanId)
  return progressId
}
