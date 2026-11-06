import { eq } from 'drizzle-orm'

/** Remove only the link; the result (what was produced) stays on the progress. */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await requireOwnedResult(user.id, id)
  await useDb().update(schema.progressResults).set({ evidenceUrl: null }).where(eq(schema.progressResults.id, id))
  return { ok: true }
})
