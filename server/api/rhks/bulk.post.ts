import { eq, sql } from 'drizzle-orm'
import { rhkBulkSchema } from '#shared/schemas/workspace'

/** Paste several RHK statements copied from an approved SKP (one per line). */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, rhkBulkSchema.parse)
  const skp = await findActiveSkp(user.id, today)
  if (!skp) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi terlebih dahulu' })
  }
  const created = await useDb().transaction(async (tx) => {
    const [max] = await tx.select({ n: sql<number>`coalesce(max(${schema.rhks.number}), 0)::int` }).from(schema.rhks).where(eq(schema.rhks.skpId, skp.id))
    const start = (max?.n ?? 0) + 1
    return tx.insert(schema.rhks).values(input.statements.map((statement, i) => ({
      skpId: skp.id,
      number: start + i,
      type: input.type,
      statement
    }))).returning()
  })
  setResponseStatus(event, 201)
  return { created: created.length }
})
