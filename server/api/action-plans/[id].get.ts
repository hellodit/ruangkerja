/** PRG-07: plan details for the side panel of the progress form. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  return getActionPlanDetail(user.id, id, today)
})
