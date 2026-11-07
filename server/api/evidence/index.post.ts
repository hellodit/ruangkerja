import { sql } from 'drizzle-orm'
import { evidenceSchema } from '#shared/schemas/workspace'

/** Attach a link to an existing progress entry (Tambah bukti / Tambah tautan). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, evidenceSchema.parse)
  await requireOwnedProgress(user.id, input.progressId)
  const r = schema.progressResults
  const [row] = await useDb().insert(r).values({
    progressId: input.progressId,
    name: input.name,
    evidenceUrl: input.evidenceUrl,
    position: sql`(select coalesce(max(${r.position}), -1) + 1 from ${r} where ${r.progressId} = ${input.progressId})`
  }).returning()
  setResponseStatus(event, 201)
  return row
})
