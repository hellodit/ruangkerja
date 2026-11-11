/** The signed-in user's own payment history (newest first). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listPaymentHistory(user.id)
})
