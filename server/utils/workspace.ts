import type { H3Event } from 'h3'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'

/**
 * One account = one workspace. Every query below is scoped to the signed-in
 * user (through skps.user_id or daily_progress.user_id) and ignores
 * soft-deleted rows; a row of another user is reported as 404.
 */

export interface WorkspaceUser {
  id: string
  name: string
  email: string
  image?: string | null
  timezone: string
  onboardingCompletedAt?: Date | string | null
}

export async function requireWorkspaceUser(event: H3Event) {
  const user = await requireUser(event) as WorkspaceUser
  const timezone = user.timezone || 'Asia/Jakarta'
  return { user, timezone, today: todayInTimeZone(timezone) }
}

const idParam = z.object({ id: z.uuid() })

export async function getIdParam(event: H3Event): Promise<string> {
  return (await getValidatedRouterParams(event, idParam.parse)).id
}

export function notFound(what = 'Data'): never {
  throw createError({ statusCode: 404, statusMessage: `${what} tidak ditemukan` })
}

// ---------------------------------------------------------------------------
// Profile & settings rows are created lazily
// ---------------------------------------------------------------------------

export async function ensureSettings(userId: string) {
  const db = useDb()
  await db.insert(schema.userSettings).values({ userId }).onConflictDoNothing()
  const [row] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId))
  return row!
}

// ---------------------------------------------------------------------------
// SKP & periods
// ---------------------------------------------------------------------------

/** The SKP for the current year, else the most recent one. */
export async function findActiveSkp(userId: string, today: string) {
  const db = useDb()
  const year = Number(today.slice(0, 4))
  const rows = await db.select().from(schema.skps).where(eq(schema.skps.userId, userId)).orderBy(desc(schema.skps.year))
  return rows.find(r => r.year === year) ?? rows[0] ?? null
}

export async function listPeriods(skpId: string) {
  return useDb().select().from(schema.evaluationPeriods)
    .where(eq(schema.evaluationPeriods.skpId, skpId))
    .orderBy(asc(schema.evaluationPeriods.sequence))
}

export type Period = Awaited<ReturnType<typeof listPeriods>>[number]

/**
 * The active SKP and its periods; `current` is the period containing today
 * or, outside the SKP year, the nearest one.
 */
export async function getWorkspace(userId: string, today: string) {
  const skp = await findActiveSkp(userId, today)
  if (!skp) {
    return null
  }
  const periods = await listPeriods(skp.id)
  const current = findCurrentPeriod(periods, today)
    ?? (today < (periods[0]?.startDate ?? '') ? periods[0] : periods.at(-1))
  return { skp, periods, current: current ?? null }
}

export async function requireWorkspace(userId: string, today: string) {
  const ws = await getWorkspace(userId, today)
  if (!ws || !ws.current) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi dan RHK terlebih dahulu' })
  }
  return ws as typeof ws & { current: Period }
}

/** Resolve ?periodId= against the user's periods, defaulting to the current one. */
export function pickPeriod(ws: { periods: Period[], current: Period | null }, periodId: unknown): Period {
  if (typeof periodId === 'string' && periodId) {
    const p = ws.periods.find(x => x.id === periodId)
    if (!p) {
      notFound('Periode')
    }
    return p
  }
  if (!ws.current) {
    notFound('Periode')
  }
  return ws.current
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export async function requireOwnedRhk(userId: string, rhkId: string) {
  const [row] = await useDb().select({ rhk: schema.rhks, skp: schema.skps })
    .from(schema.rhks)
    .innerJoin(schema.skps, eq(schema.skps.id, schema.rhks.skpId))
    .where(and(eq(schema.rhks.id, rhkId), eq(schema.skps.userId, userId), isNull(schema.rhks.deletedAt)))
  if (!row) {
    notFound('RHK')
  }
  return row
}

export async function requireOwnedPeriod(userId: string, periodId: string) {
  const [row] = await useDb().select({ period: schema.evaluationPeriods })
    .from(schema.evaluationPeriods)
    .innerJoin(schema.skps, eq(schema.skps.id, schema.evaluationPeriods.skpId))
    .where(and(eq(schema.evaluationPeriods.id, periodId), eq(schema.skps.userId, userId)))
  if (!row) {
    notFound('Periode')
  }
  return row.period
}

export async function requireOwnedActionPlan(userId: string, planId: string) {
  const [row] = await useDb().select({ plan: schema.actionPlans, rhk: schema.rhks })
    .from(schema.actionPlans)
    .innerJoin(schema.rhks, eq(schema.rhks.id, schema.actionPlans.rhkId))
    .innerJoin(schema.skps, eq(schema.skps.id, schema.rhks.skpId))
    .where(and(
      eq(schema.actionPlans.id, planId),
      eq(schema.skps.userId, userId),
      isNull(schema.actionPlans.deletedAt),
      isNull(schema.rhks.deletedAt)
    ))
  if (!row) {
    notFound('Rencana aksi')
  }
  return row
}

export async function requireOwnedProgress(userId: string, progressId: string) {
  const [row] = await useDb().select().from(schema.dailyProgress)
    .where(and(eq(schema.dailyProgress.id, progressId), eq(schema.dailyProgress.userId, userId), isNull(schema.dailyProgress.deletedAt)))
  if (!row) {
    notFound('Progres harian')
  }
  return row
}

// ---------------------------------------------------------------------------
// Derived values (never stored — PRD "Nilai turunan")
// ---------------------------------------------------------------------------

/** Realization sum, progress count and evidence-less progress count per action plan. */
export async function planStats(planIds: string[]) {
  const stats = new Map<string, { realization: number, progressCount: number, missingEvidence: number }>()
  if (!planIds.length) {
    return stats
  }
  const rows = await useDb().select({
    planId: schema.dailyProgress.actionPlanId,
    realization: sql<string>`coalesce(sum(${schema.dailyProgress.realization}), 0)`,
    progressCount: sql<number>`count(*)::int`,
    // Fully qualified: inside the subquery an unqualified "id" would bind to r.id.
    missingEvidence: sql<number>`count(*) filter (where not exists (
      select 1 from progress_results r
      where r.progress_id = "daily_progress"."id" and r.evidence_url is not null
    ))::int`
  }).from(schema.dailyProgress)
    .where(and(inArray(schema.dailyProgress.actionPlanId, planIds), isNull(schema.dailyProgress.deletedAt)))
    .groupBy(schema.dailyProgress.actionPlanId)
  for (const r of rows) {
    stats.set(r.planId, { realization: Number(r.realization), progressCount: r.progressCount, missingEvidence: r.missingEvidence })
  }
  return stats
}

/** Active (non-deleted) RHKs of an SKP with their indicators, ordered by number. */
export async function listRhks(skpId: string) {
  const db = useDb()
  const rhks = await db.select().from(schema.rhks)
    .where(and(eq(schema.rhks.skpId, skpId), isNull(schema.rhks.deletedAt)))
    .orderBy(asc(schema.rhks.number))
  const indicators = rhks.length
    ? await db.select().from(schema.rhkIndicators)
        .where(inArray(schema.rhkIndicators.rhkId, rhks.map(r => r.id)))
        .orderBy(asc(schema.rhkIndicators.position))
    : []
  return rhks.map(r => ({ ...r, indicators: indicators.filter(i => i.rhkId === r.id) }))
}

/** Action plans of the given RHKs in one period, with derived values. */
export async function listPlans(rhkIds: string[], periodId: string, today: string) {
  if (!rhkIds.length) {
    return []
  }
  const plans = await useDb().select().from(schema.actionPlans)
    .where(and(inArray(schema.actionPlans.rhkId, rhkIds), eq(schema.actionPlans.periodId, periodId), isNull(schema.actionPlans.deletedAt)))
    .orderBy(asc(schema.actionPlans.position), asc(schema.actionPlans.createdAt))
  const stats = await planStats(plans.map(p => p.id))
  return plans.map((p) => {
    const s = stats.get(p.id) ?? { realization: 0, progressCount: 0, missingEvidence: 0 }
    return {
      ...p,
      ...s,
      overdue: isOverdue(p, today),
      achievement: achievementPercent(s.realization, p.target)
    }
  })
}

export type PlanWithStats = Awaited<ReturnType<typeof listPlans>>[number]

/**
 * Apply the PRD's automatic status rules after progress changed: first
 * progress → berjalan, progress marked complete → selesai. Manual status set
 * by the user is otherwise preserved.
 */
export async function syncPlanStatus(planId: string) {
  const db = useDb()
  const [plan] = await db.select().from(schema.actionPlans).where(eq(schema.actionPlans.id, planId))
  if (!plan) {
    return
  }
  const [agg] = await db.select({
    n: sql<number>`count(*)::int`,
    completes: sql<number>`count(*) filter (where ${schema.dailyProgress.marksPlanComplete})::int`,
    completedOn: sql<string | null>`max(${schema.dailyProgress.workDate}) filter (where ${schema.dailyProgress.marksPlanComplete})`
  }).from(schema.dailyProgress)
    .where(and(eq(schema.dailyProgress.actionPlanId, planId), isNull(schema.dailyProgress.deletedAt)))
  if ((agg?.completes ?? 0) > 0 && plan.status !== 'selesai') {
    // Completion date = the work date of the progress that finished it
    // (05:00Z is midday in WIB/WITA/WIT, so the calendar date is stable).
    const completedAt = agg?.completedOn ? new Date(`${String(agg.completedOn).slice(0, 10)}T05:00:00Z`) : new Date()
    await db.update(schema.actionPlans).set({ status: 'selesai', completedAt }).where(eq(schema.actionPlans.id, planId))
  } else if ((agg?.n ?? 0) > 0 && plan.status === 'belum_dimulai') {
    await db.update(schema.actionPlans).set({ status: 'berjalan' }).where(eq(schema.actionPlans.id, planId))
  }
}

export async function requireOwnedResult(userId: string, resultId: string) {
  const [row] = await useDb().select({ result: schema.progressResults })
    .from(schema.progressResults)
    .innerJoin(schema.dailyProgress, eq(schema.dailyProgress.id, schema.progressResults.progressId))
    .where(and(eq(schema.progressResults.id, resultId), eq(schema.dailyProgress.userId, userId), isNull(schema.dailyProgress.deletedAt)))
  if (!row) {
    notFound('Bukti')
  }
  return row.result
}
