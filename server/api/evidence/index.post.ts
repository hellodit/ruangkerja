import { eq, sql } from 'drizzle-orm'
import { evidenceSchema } from '#shared/schemas/workspace'

/** Attach a link to an existing progress entry (Tambah bukti / Tambah tautan). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, evidenceSchema.parse)
  await requireOwnedProgress(user.id, input.progressId)
  const db = useDb()
  const [max] = await db.select({ n: sql<number>`coalesce(max(${schema.progressResults.position}), -1)::int` })
    .from(schema.progressResults).where(eq(schema.progressResults.progressId, input.progressId))
  const [row] = await db.insert(schema.progressResults).values({
    progressId: input.progressId,
    name: input.name,
    evidenceUrl: input.evidenceUrl,
    position: (max?.n ?? -1) + 1
  }).returning()
  setResponseStatus(event, 201)
  return row
})
