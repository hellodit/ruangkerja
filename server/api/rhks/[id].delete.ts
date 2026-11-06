import { eq } from 'drizzle-orm'

/**
 * Soft delete. Its action plans and progress disappear from every view
 * (queries join through a non-deleted RHK) but stay recoverable.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await requireOwnedRhk(user.id, id)
  await useDb().update(schema.rhks).set({ deletedAt: new Date() }).where(eq(schema.rhks.id, id))
  return { ok: true }
})
