import { adminDashboardQuery } from '#shared/schemas/admin'

/** Admin dashboard: headline numbers, daily series and short lists (see getAdminDashboard). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { days } = await getValidatedQuery(event, adminDashboardQuery.parse)
  return getAdminDashboard(days)
})
