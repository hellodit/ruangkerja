import { and, eq, isNull } from 'drizzle-orm'
import { assignPackageSchema } from '#shared/schemas/admin'

/**
 * Admin assigns a package by hand (e.g. after a bank transfer). Records a
 * paid manual transaction; the package ends at the user's current end date
 * (or today when nothing is active) plus the package's duration. The user
 * row is locked so two assignments at once cannot overlap.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const input = await readValidatedBody(event, assignPackageSchema.parse)
  const db = useDb()

  const result = await db.transaction(async (tx) => {
    const user = await lockUser(tx, input.userId)
    if (!user) notFound('Pengguna')

    const [pkg] = await tx.select().from(schema.packages)
      .where(and(eq(schema.packages.id, input.packageId), isNull(schema.packages.deletedAt)))
    if (!pkg) notFound('Paket')
    if (!pkg.isActive) {
      throw createError({ statusCode: 422, statusMessage: 'Paket ini nonaktif. Aktifkan dulu sebelum di-assign.' })
    }

    const now = new Date()
    const period = computePackagePeriod({ now, currentEnd: await paidUntil(tx, user.id, now), durationDays: pkg.durationDays })
    const [row] = await tx.insert(schema.transactions).values({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      amount: input.amount,
      method: 'manual',
      status: 'paid',
      periodStart: period.start,
      periodEnd: period.end,
      reference: input.reference,
      notes: input.notes,
      createdBy: admin.id,
      paidAt: now
    }).returning({ id: schema.transactions.id, periodStart: schema.transactions.periodStart, periodEnd: schema.transactions.periodEnd })
    return row!
  })

  setResponseStatus(event, 201)
  return result
})
