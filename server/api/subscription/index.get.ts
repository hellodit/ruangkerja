/** The signed-in user's package status, the packages on sale and any order awaiting payment. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return getSubscriptionStatus(user.id)
})
