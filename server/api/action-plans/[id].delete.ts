/** Soft delete; its progress is hidden with it (reads require a live plan). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await deleteActionPlan(user.id, id)
  return { ok: true }
})
