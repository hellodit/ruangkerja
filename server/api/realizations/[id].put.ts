import { and, eq } from 'drizzle-orm'
import { realizationUpdateSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, realizationUpdateSchema.parse)
  const pr = schema.periodRealizations
  const [row] = await useDb().update(pr).set({ finalText: input.finalText || null })
    .where(and(eq(pr.id, id), ownsRhk(user.id, pr.rhkId)))
    .returning({ id: pr.id })
  if (!row) notFound('Realisasi')
  return { ok: true }
})
