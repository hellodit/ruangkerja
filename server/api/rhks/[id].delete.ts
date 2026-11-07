/**
 * Soft delete. Its action plans and progress disappear from every view
 * (reads require a live RHK) but stay recoverable.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await deleteRhk(user.id, id)
  return { ok: true }
})
