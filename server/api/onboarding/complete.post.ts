/** ONB-05: finish onboarding once profile essentials, SKP and ≥1 RHK exist. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  await completeOnboarding(user.id, today)
  return { ok: true }
})
