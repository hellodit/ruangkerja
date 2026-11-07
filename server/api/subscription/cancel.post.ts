import { and, eq } from 'drizzle-orm'

/** The user withdraws their order awaiting payment. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const t = schema.transactions
  await useDb().update(t).set({ status: 'cancelled', notes: 'Dibatalkan pengguna' })
    .where(and(eq(t.userId, user.id), eq(t.status, 'pending')))
  return { ok: true }
})
