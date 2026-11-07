import { and, desc, eq, gt, inArray, lte } from 'drizzle-orm'

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

/** True when the user has a paid package running right now. */
export async function hasActivePackage(userId: string, now = new Date()): Promise<boolean> {
  const t = schema.transactions
  const [row] = await useDb().select({ id: t.id }).from(t)
    .where(and(eq(t.userId, userId), eq(t.status, 'paid'), lte(t.periodStart, now), gt(t.periodEnd, now)))
    .limit(1)
  return !!row
}

type Tx = Parameters<Parameters<ReturnType<typeof useDb>['transaction']>[0]>[0]

/** Lock the user row so concurrent payments for one user are applied one after another. */
export async function lockUser(tx: Tx, userId: string) {
  const [user] = await tx.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users).where(eq(schema.users.id, userId)).for('update')
  return user ?? null
}

/**
 * Mark a pending order paid and grant its package: the period continues
 * after the user's current paid coverage (or starts now). Shared by the
 * admin "Konfirmasi lunas" action and, later, the SingaPay webhook.
 */
export async function activatePendingTransaction(transactionId: string, opts: { reference?: string | null, confirmedBy?: string | null } = {}) {
  return useDb().transaction(async (tx) => {
    const t = schema.transactions
    const [found] = await tx.select({ userId: t.userId }).from(t).where(eq(t.id, transactionId))
    if (!found) notFound('Transaksi')
    // Same lock order as checkout and manual assign (user row first) so they
    // can never deadlock; then re-read the order under the lock.
    if (!found.userId || !(await lockUser(tx, found.userId))) notFound('Pengguna')
    const [order] = await tx.select().from(t).where(eq(t.id, transactionId)).for('update')
    if (!order || order.status !== 'pending' || order.userId !== found.userId) {
      throw createError({ statusCode: 409, statusMessage: 'Transaksi ini sudah tidak menunggu pembayaran.' })
    }

    const now = new Date()
    const period = computePackagePeriod({ now, currentEnd: await paidUntil(tx, found.userId, now), durationDays: order.durationDays })
    const [row] = await tx.update(t).set({
      status: 'paid',
      paidAt: now,
      periodStart: period.start,
      periodEnd: period.end,
      reference: opts.reference ?? order.reference,
      createdBy: opts.confirmedBy ?? order.createdBy
    }).where(eq(t.id, order.id)).returning()
    return row!
  })
}
