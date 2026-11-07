/** BRD-01..03: read-only overview of the current period. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  return getDashboard(user, today)
})
