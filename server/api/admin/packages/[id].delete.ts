import { and, eq, isNull } from 'drizzle-orm'

/**
 * Archive a package: hidden from the list and from assignment. Transactions
 * that used it keep their copy of its name and duration, and users keep the
 * period they already paid for.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = await getIdParam(event)
  const p = schema.packages
  const [row] = await useDb().update(p).set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(p.id, id), isNull(p.deletedAt))).returning({ id: p.id })
  if (!row) notFound('Paket')
  return { ok: true }
})
