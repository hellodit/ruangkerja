import type { H3Event } from 'h3'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

/**
 * Request guards for the workspace API. One account = one workspace: every
 * lookup is scoped to the signed-in user (through skps.user_id or
 * daily_progress.user_id) and ignores soft-deleted rows; a row of another
 * user is reported as 404. The longer reads live in server/services.
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
// Ownership (one query each)
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
