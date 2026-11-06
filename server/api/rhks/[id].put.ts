import { eq } from 'drizzle-orm'
import { rhkSchema } from '#shared/schemas/workspace'

/** RHK-06: edit anytime. This never changes the official SKP. */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await requireOwnedRhk(user.id, id)
  const input = await readValidatedBody(event, rhkSchema.parse)
  await useDb().transaction(async (tx) => {
    await tx.update(schema.rhks).set({ statement: input.statement, type: input.type, supervisorRhk: input.supervisorRhk ?? null }).where(eq(schema.rhks.id, id))
    await tx.delete(schema.rhkIndicators).where(eq(schema.rhkIndicators.rhkId, id))
    await tx.insert(schema.rhkIndicators).values(input.indicators.map((ind, i) => ({ ...ind, rhkId: id, position: i })))
  })
  return { ok: true }
})
