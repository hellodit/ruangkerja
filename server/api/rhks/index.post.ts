import { and, eq, sql } from 'drizzle-orm'
import { rhkSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, rhkSchema.parse)
  const skp = await findActiveSkp(user.id, today)
  if (!skp) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi terlebih dahulu' })
  }
  const db = useDb()
  const rhk = await db.transaction(async (tx) => {
    const [max] = await tx.select({ n: sql<number>`coalesce(max(${schema.rhks.number}), 0)::int` }).from(schema.rhks)
      .where(and(eq(schema.rhks.skpId, skp.id)))
    const [row] = await tx.insert(schema.rhks).values({
      skpId: skp.id,
      number: (max?.n ?? 0) + 1,
      type: input.type,
      statement: input.statement,
      supervisorRhk: input.supervisorRhk ?? null
    }).returning()
    await tx.insert(schema.rhkIndicators).values(input.indicators.map((ind, i) => ({ ...ind, rhkId: row!.id, position: i })))
    return row!
  })
  setResponseStatus(event, 201)
  return rhk
})
