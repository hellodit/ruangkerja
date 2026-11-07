import { and, asc, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm'

export interface ProgressFilters {
  from?: string
  to?: string
  rhkId?: string
  actionPlanId?: string
  actionPlanIds?: string[]
  ids?: string[]
  order?: 'asc' | 'desc'
}

/**
 * Progress entries of one user with their plan, RHK and results, in one
 * relational query. Entries under a soft-deleted plan or RHK are excluded
 * (correlated EXISTS on the plan's primary key).
 */
export async function loadProgress(userId: string, f: ProgressFilters = {}) {
  const dp = schema.dailyProgress
  const where: SQL[] = [eq(dp.userId, userId), isNull(dp.deletedAt)]
  if (f.from) where.push(gte(dp.workDate, f.from))
  if (f.to) where.push(lte(dp.workDate, f.to))
  if (f.actionPlanId) where.push(eq(dp.actionPlanId, f.actionPlanId))
  for (const list of [f.ids, f.actionPlanIds]) {
    if (list && !list.length) {
      return []
    }
  }
  if (f.ids) where.push(inArray(dp.id, f.ids))
  if (f.actionPlanIds) where.push(inArray(dp.actionPlanId, f.actionPlanIds))
  // The plan and its RHK must be live (and match ?rhkId=). Written as a SQL
  // template so the relational query maps daily_progress to its alias.
  where.push(sql`exists (select 1 from action_plans ap join rhks r on r.id = ap.rhk_id
    where ap.id = ${dp.actionPlanId} and ap.deleted_at is null and r.deleted_at is null
    ${f.rhkId ? sql`and r.id = ${f.rhkId}` : sql``})`)

  const dir = f.order === 'asc' ? asc : desc
  const rows = await useDb().query.dailyProgress.findMany({
    where: and(...where),
    orderBy: [dir(dp.workDate), dir(dp.startTime)],
    with: {
      actionPlan: {
        columns: { id: true, name: true, unit: true, target: true, periodId: true },
        with: { rhk: { columns: { id: true, number: true, statement: true } } }
      },
      results: { orderBy: (r, { asc }) => [asc(r.position)] }
    }
  })

  return rows.map(({ actionPlan: { rhk, ...plan }, ...p }) => ({
    ...p,
    startTime: p.startTime.slice(0, 5),
    endTime: p.endTime.slice(0, 5),
    plan,
    rhk,
    hasEvidence: p.results.some(r => !!r.evidenceUrl)
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

/**
 * Insert or replace a progress entry with its results and re-apply the plan
 * status rules, all in one transaction. `previousPlanId` is the plan the entry
 * belonged to before an edit moved it (its status is re-checked too).
 */
export async function saveProgress(userId: string, id: string | null, input: ProgressPayload, previousPlanId?: string) {
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
  return useDb().transaction(async (tx) => {
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
    await syncPlanStatus(input.actionPlanId, tx)
    if (previousPlanId && previousPlanId !== input.actionPlanId) {
      await syncPlanStatus(previousPlanId, tx)
    }
    return pid!
  })
}
