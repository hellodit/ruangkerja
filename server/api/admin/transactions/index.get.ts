import { adminTransactionsQuery } from '#shared/schemas/admin'

/** Admin: transaction history with revenue numbers (see listTransactions). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = await getValidatedQuery(event, adminTransactionsQuery.parse)
  return listTransactions(query)
})
