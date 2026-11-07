import { and, eq, isNull } from 'drizzle-orm'
import { packageSchema } from '#shared/schemas/admin'

/** Editing a package never changes past transactions (they keep their own copy). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, packageSchema.parse)
  const p = schema.packages
  const [row] = await useDb().update(p).set(input).where(and(eq(p.id, id), isNull(p.deletedAt))).returning({ id: p.id })
  if (!row) notFound('Paket')
  return { id: row.id }
})
