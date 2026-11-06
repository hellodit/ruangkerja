import { and, eq } from 'drizzle-orm'
import { realizationUpdateSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, realizationUpdateSchema.parse)
  const [row] = await useDb().select({ r: schema.periodRealizations }).from(schema.periodRealizations)
    .innerJoin(schema.rhks, eq(schema.rhks.id, schema.periodRealizations.rhkId))
    .innerJoin(schema.skps, eq(schema.skps.id, schema.rhks.skpId))
    .where(and(eq(schema.periodRealizations.id, id), eq(schema.skps.userId, user.id)))
  if (!row) {
    notFound('Realisasi')
  }
  await useDb().update(schema.periodRealizations).set({ finalText: input.finalText || null }).where(eq(schema.periodRealizations.id, id))
  return { ok: true }
})
