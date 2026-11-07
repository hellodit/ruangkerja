import { and, eq } from 'drizzle-orm'

/** Admin cancels a pending order (no payment arrived). Paid transactions cannot be cancelled here. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = await getIdParam(event)
  const t = schema.transactions
  const [row] = await useDb().update(t).set({ status: 'cancelled' })
    .where(and(eq(t.id, id), eq(t.status, 'pending'))).returning({ id: t.id })
  if (!row) {
    throw createError({ statusCode: 409, statusMessage: 'Hanya transaksi yang menunggu pembayaran yang bisa dibatalkan.' })
  }
  return { ok: true }
})
