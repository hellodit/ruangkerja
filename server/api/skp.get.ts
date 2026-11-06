export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const ws = await getWorkspace(user.id, today)
  return ws ? { skp: ws.skp, periods: ws.periods, current: ws.current, today } : { skp: null, periods: [], current: null, today }
})
