import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { checkoutSchema } from '#shared/schemas/admin'

/**
 * The user picks a package: creates an order awaiting payment (manual bank
 * transfer for now; an admin confirms it in the panel). A user has at most
 * one pending order: choosing again replaces the previous one.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const { packageId } = await readValidatedBody(event, checkoutSchema.parse)

  const order = await useDb().transaction(async (tx) => {
    const user = await lockUser(tx, sessionUser.id)
    if (!user) notFound('Pengguna')
    const [pkg] = await tx.select().from(schema.packages)
      .where(and(eq(schema.packages.id, packageId), eq(schema.packages.isActive, true), isNull(schema.packages.deletedAt)))
    if (!pkg) notFound('Paket')

    const t = schema.transactions
    await tx.update(t).set({ status: 'cancelled', notes: 'Diganti pesanan baru oleh pengguna' })
      .where(and(eq(t.userId, user.id), eq(t.status, 'pending')))

    const [row] = await tx.insert(t).values({
      code: orderCode(todayInTimeZone('Asia/Jakarta'), randomBytes(6)),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      amount: pkg.price,
      method: 'manual',
      status: 'pending'
    }).returning({ id: t.id, code: t.code, packageName: t.packageName, amount: t.amount, durationDays: t.durationDays, createdAt: t.createdAt })
    return row!
  })

  setResponseStatus(event, 201)
  return order
})
