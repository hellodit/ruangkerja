import { and, eq } from 'drizzle-orm'
import { evidenceUpdateSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, evidenceUpdateSchema.parse)
  const r = schema.progressResults
  const [row] = await useDb().update(r)
    .set({ name: input.name, evidenceUrl: input.evidenceUrl ?? null })
    .where(and(eq(r.id, id), ownsProgress(user.id, r.progressId)))
    .returning()
  if (!row) notFound('Bukti')
  return row
})
