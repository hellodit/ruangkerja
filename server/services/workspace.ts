import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm'

/**
 * Workspace reads: the active SKP with its periods, RHKs with indicators and
 * action plans with their derived values. Related rows are loaded through the
 * relational query API (one SQL statement per call) and derived values are
 * correlated subqueries (`extras`), never a second round trip.
 */

export type Db = ReturnType<typeof useDb>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export type Period = typeof schema.evaluationPeriods.$inferSelect

type PlanColumns = typeof schema.actionPlans._.columns

/** Current year's SKP first, else the most recent one. */
const activeSkpFirst = (today: string) => [desc(sql`${schema.skps.year} = ${Number(today.slice(0, 4))}`), desc(schema.skps.year)]

/** The SKP for the current year, else the most recent one (no periods). */
export async function findActiveSkp(userId: string, today: string) {
  return (await useDb().query.skps.findFirst({
    where: eq(schema.skps.userId, userId),
    orderBy: activeSkpFirst(today)
  })) ?? null
}

/** The period containing today or, outside the SKP year, the nearest one. */
export function currentPeriodOf(periods: Period[], today: string) {
  return findCurrentPeriod(periods, today)
    ?? (today < (periods[0]?.startDate ?? '') ? periods[0] : periods.at(-1))
    ?? null
}

/** The active SKP and its periods, in one query. */
export async function getWorkspace(userId: string, today: string) {
  const row = await useDb().query.skps.findFirst({
    where: eq(schema.skps.userId, userId),
    orderBy: activeSkpFirst(today),
    with: { periods: { orderBy: (p, { asc }) => [asc(p.sequence)] } }
  })
  if (!row) {
    return null
  }
  const { periods, ...skp } = row
  return { skp, periods, current: currentPeriodOf(periods, today) }
}

export type Workspace = NonNullable<Awaited<ReturnType<typeof getWorkspace>>>

export async function requireWorkspace(userId: string, today: string) {
  const ws = await getWorkspace(userId, today)
  if (!ws || !ws.current) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi dan RHK terlebih dahulu' })
  }
  return ws as Workspace & { current: Period }
}

// ---------------------------------------------------------------------------
// Action plan derived values (PRD "Nilai turunan", never stored)
// ---------------------------------------------------------------------------

/**
 * Realization sum, progress count and evidence-less progress count of one
 * plan, as correlated subqueries on daily_progress (index daily_progress_plan_idx).
 * `p` is the (aliased) action_plans table of the relational query. Only use
 * it on a nested relation or a query that also has `with`: without `with`,
 * Drizzle 0.x renders root columns unqualified and the subquery would bind
 * "id" to daily_progress.
 */
export const planStatsExtras = (p: PlanColumns) => ({
  realizationSum: sql<string>`(select coalesce(sum(dp.realization), 0) from daily_progress dp
    where dp.action_plan_id = ${p.id} and dp.deleted_at is null)`.as('realization_sum'),
  progressCount: sql<number>`(select count(*)::int from daily_progress dp
    where dp.action_plan_id = ${p.id} and dp.deleted_at is null)`.as('progress_count'),
  missingEvidence: sql<number>`(select count(*)::int from daily_progress dp
    where dp.action_plan_id = ${p.id} and dp.deleted_at is null
      and not exists (select 1 from progress_results r where r.progress_id = dp.id and r.evidence_url is not null))`.as('missing_evidence')
})

type PlanRow = typeof schema.actionPlans.$inferSelect & { realizationSum: string | number, progressCount: number, missingEvidence: number }

/** Shape a plan loaded with planStatsExtras into the API's plan-with-stats. */
export function withPlanStats<T extends PlanRow>({ realizationSum, ...plan }: T, today: string) {
  const realization = Number(realizationSum)
  return {
    ...plan,
    realization,
    progressCount: Number(plan.progressCount),
    missingEvidence: Number(plan.missingEvidence),
    overdue: isOverdue(plan, today),
    achievement: achievementPercent(realization, plan.target)
  }
}

export type PlanWithStats = ReturnType<typeof withPlanStats<PlanRow>>

/** `with` config: the live action plans of one period, ordered, with derived values. */
export const livePlansIn = (periodId: string) => ({
  where: (p: PlanColumns) => and(eq(p.periodId, periodId), isNull(p.deletedAt)),
  orderBy: (p: PlanColumns) => [asc(p.position), asc(p.createdAt)],
  extras: planStatsExtras
})

/** Active (non-deleted) RHKs of an SKP with their indicators, ordered by number. */
export async function listRhks(skpId: string) {
  return useDb().query.rhks.findMany({
    where: and(eq(schema.rhks.skpId, skpId), isNull(schema.rhks.deletedAt)),
    orderBy: asc(schema.rhks.number),
    with: { indicators: { orderBy: (i, { asc }) => [asc(i.position)] } }
  })
}

/** No period yet: a uuid that matches nothing keeps the single-query shape. */
const NO_PERIOD = '00000000-0000-0000-0000-000000000000'

/**
 * Active RHKs of an SKP with their indicators and the action plans of one
 * period (with derived values), in a single query. `plans` is the same plans
 * flattened in RHK order.
 */
export async function listRhksWithPlans(skpId: string, periodId: string | null, today: string) {
  const rows = await useDb().query.rhks.findMany({
    where: and(eq(schema.rhks.skpId, skpId), isNull(schema.rhks.deletedAt)),
    orderBy: asc(schema.rhks.number),
    with: {
      indicators: { orderBy: (i, { asc }) => [asc(i.position)] },
      actionPlans: livePlansIn(periodId ?? NO_PERIOD)
    }
  })
  const rhks = rows.map(({ actionPlans, ...rhk }) => ({ ...rhk, plans: actionPlans.map(p => withPlanStats(p, today)) }))
  return { rhks, plans: rhks.flatMap(r => r.plans) }
}

// ---------------------------------------------------------------------------
// Ownership predicates (correlated EXISTS through the user's SKP)
// ---------------------------------------------------------------------------

/** `rhkId` is a live RHK of one of the user's SKPs. */
export function ownsRhk(userId: string, rhkId: SQL.Aliased | SQL | typeof schema.rhks.id | typeof schema.actionPlans.rhkId | typeof schema.periodRealizations.rhkId) {
  return sql`exists (select 1 from rhks r join skps s on s.id = r.skp_id
    where r.id = ${rhkId} and r.deleted_at is null and s.user_id = ${userId})`
}

/** `planId` is a live action plan under a live RHK of the user. */
export function ownsActionPlan(userId: string, planId: SQL | typeof schema.actionPlans.id | typeof schema.dailyProgress.actionPlanId) {
  return sql`exists (select 1 from action_plans ap join rhks r on r.id = ap.rhk_id join skps s on s.id = r.skp_id
    where ap.id = ${planId} and ap.deleted_at is null and r.deleted_at is null and s.user_id = ${userId})`
}

/** `progressId` is a live progress entry of the user. */
export function ownsProgress(userId: string, progressId: SQL | typeof schema.dailyProgress.id | typeof schema.progressResults.progressId) {
  return sql`exists (select 1 from daily_progress dp
    where dp.id = ${progressId} and dp.user_id = ${userId} and dp.deleted_at is null)`
}

// ---------------------------------------------------------------------------
// Status rules
// ---------------------------------------------------------------------------

/**
 * Apply the PRD's automatic status rules after progress changed, in one
 * statement: first progress → berjalan, progress marked complete → selesai
 * (completed on that progress's work date, 05:00Z = midday in WIB/WITA/WIT).
 * A status the user set by hand is otherwise preserved. Pass the transaction
 * handle when called inside one.
 */
export async function syncPlanStatus(planId: string, db: Db | Tx = useDb()) {
  const ap = schema.actionPlans
  const dp = schema.dailyProgress
  const agg = db.select({
    n: sql<number>`count(*)`.as('n'),
    completes: sql<number>`count(*) filter (where ${dp.marksPlanComplete})`.as('completes'),
    completedOn: sql<string | null>`max(${dp.workDate}) filter (where ${dp.marksPlanComplete})`.as('completed_on')
  }).from(dp).where(and(eq(dp.actionPlanId, planId), isNull(dp.deletedAt))).as('agg')

  await db.update(ap).set({
    status: sql`case when ${agg.completes} > 0 then 'selesai'::action_plan_status
      when ${agg.n} > 0 and ${ap.status} = 'belum_dimulai' then 'berjalan'::action_plan_status
      else ${ap.status} end`,
    completedAt: sql`case when ${agg.completes} > 0 and ${ap.status} <> 'selesai'
      then (${agg.completedOn} + time '05:00') at time zone 'UTC' else ${ap.completedAt} end`
  }).from(agg).where(and(
    eq(ap.id, planId),
    sql`((${agg.completes} > 0 and ${ap.status} <> 'selesai') or (${agg.n} > 0 and ${ap.status} = 'belum_dimulai'))`
  ))
}
