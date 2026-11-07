import { and, desc, eq, gt, inArray } from 'drizzle-orm'

type Db = Pick<ReturnType<typeof useDb>, 'select'>

export interface ActivePackage {
  packageId: string | null
  name: string
  startsAt: Date
  endsAt: Date
  /** End of all paid coverage, including renewals queued after the current period. */
  paidUntil: Date
}

/**
 * Active package per user: the paid transaction whose period covers `now`
 * (the one ending last if periods overlap). Users whose only paid periods
 * start in the future have no active package yet.
 */
export async function activePackages(userIds: string[], now = new Date()): Promise<Map<string, ActivePackage>> {
  const out = new Map<string, ActivePackage>()
  if (!userIds.length) return out
  const t = schema.transactions
  const rows = await useDb().select({ userId: t.userId, packageId: t.packageId, name: t.packageName, start: t.periodStart, end: t.periodEnd })
    .from(t)
    .where(and(inArray(t.userId, userIds), eq(t.status, 'paid'), gt(t.periodEnd, now)))
    .orderBy(desc(t.periodEnd))

  for (const userId of userIds) {
    const mine = rows.filter(r => r.userId === userId && r.start && r.end)
    // Sorted by end desc and every end is in the future: the first one that
    // has started is the running period.
    const current = mine.find(r => r.start! <= now)
    if (current) {
      out.set(userId, { packageId: current.packageId, name: current.name, startsAt: current.start!, endsAt: current.end!, paidUntil: mine[0]!.end! })
    }
  }
  return out
}

/** End of the user's paid coverage that is still in the future, or null. Call inside the assigning transaction. */
export async function paidUntil(db: Db, userId: string, now: Date): Promise<Date | null> {
  const t = schema.transactions
  const [row] = await db.select({ end: t.periodEnd }).from(t)
    .where(and(eq(t.userId, userId), eq(t.status, 'paid'), gt(t.periodEnd, now)))
    .orderBy(desc(t.periodEnd))
    .limit(1)
  return row?.end ?? null
}
