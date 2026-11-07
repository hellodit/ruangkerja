/** PRD privacy: the user can export all their data (JSON). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const data = await exportAccount(user.id)
  setResponseHeaders(event, {
    'content-type': 'application/json; charset=utf-8',
    'content-disposition': `attachment; filename="ruangkerja-data-${todayInTimeZone(user.timezone)}.json"`,
    'cache-control': 'no-store'
  })
  return {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, timezone: user.timezone },
    ...data
  }
})
