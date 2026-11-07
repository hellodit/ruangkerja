/** RHK-02/03/05: one RHK with its plans for a period and related context. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  return getRhkDetail(user.id, id, today, getQuery(event).periodId)
})
