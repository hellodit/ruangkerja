import { and, desc, eq, gt, lte } from 'drizzle-orm'

export interface ActivePackage {
  packageId: string | null
  name: string
  startsAt: Date
  endsAt: Date
  /** End of all paid coverage, including renewals queued after the current period. */
  paidUntil: Date
}

type TransactionColumns = typeof schema.transactions._.columns

/**
 * `with` config for users.transactions: the user's paid periods that have not
 * ended yet, newest end first. Feed the result to pickActivePackage().
 */
export const paidCoverage = (now: Date) => ({
  columns: { packageId: true, packageName: true, periodStart: true, periodEnd: true } as const,
  where: (t: TransactionColumns) => and(eq(t.status, 'paid'), gt(t.periodEnd, now)),
  orderBy: (t: TransactionColumns) => [desc(t.periodEnd)]
})

/**
 * The active package among paid periods that end after `now` (sorted by end,
 * newest first): the first one that has started; `paidUntil` is the end of all
 * coverage. Users whose paid periods all start in the future have none yet.
 */
export function pickActivePackage(
  rows: { packageId: string | null, packageName: string, periodStart: Date | null, periodEnd: Date | null }[],
  now = new Date()
): ActivePackage | null {
  const covered = rows.filter(r => r.periodStart && r.periodEnd)
  const current = covered.find(r => r.periodStart! <= now)
  if (!current) {
    return null
  }
  return { packageId: current.packageId, name: current.packageName, startsAt: current.periodStart!, endsAt: current.periodEnd!, paidUntil: covered[0]!.periodEnd! }
}

/** End of the user's paid coverage that is still in the future, or null. Call inside the assigning transaction. */
export async function paidUntil(db: Pick<Db, 'select'>, userId: string, now: Date): Promise<Date | null> {
  const t = schema.transactions
  const [row] = await db.select({ end: t.periodEnd }).from(t)
    .where(and(eq(t.userId, userId), eq(t.status, 'paid'), gt(t.periodEnd, now)))
    .orderBy(desc(t.periodEnd))
    .limit(1)
  return row?.end ?? null
}

/** True when the user has a paid package running right now (index transactions_user_idx). */
export async function hasActivePackage(userId: string, now = new Date()): Promise<boolean> {
  const t = schema.transactions
  const [row] = await useDb().select({ id: t.id }).from(t)
    .where(and(eq(t.userId, userId), eq(t.status, 'paid'), lte(t.periodStart, now), gt(t.periodEnd, now)))
    .limit(1)
  return !!row
}

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
