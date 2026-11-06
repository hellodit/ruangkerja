import { eq } from 'drizzle-orm'
import { evidenceUpdateSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await requireOwnedResult(user.id, id)
  const input = await readValidatedBody(event, evidenceUpdateSchema.parse)
  const [row] = await useDb().update(schema.progressResults)
    .set({ name: input.name, evidenceUrl: input.evidenceUrl ?? null })
    .where(eq(schema.progressResults.id, id)).returning()
  return row
})
