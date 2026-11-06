import { progressSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const existing = await requireOwnedProgress(user.id, id)
  const input = await readValidatedBody(event, progressSchema.parse)
  await requireOwnedActionPlan(user.id, input.actionPlanId)
  await saveProgress(user.id, id, input)
  if (existing.actionPlanId !== input.actionPlanId) {
    await syncPlanStatus(existing.actionPlanId)
  }
  return { id }
})
