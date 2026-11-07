import { adminUsersQuery } from '#shared/schemas/admin'

/** Admin panel: paginated user list with basic account and activity facts (see listUsers). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = await getValidatedQuery(event, adminUsersQuery.parse)
  return listUsers(query)
})
