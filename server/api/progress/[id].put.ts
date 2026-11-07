import { progressSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const existing = await requireOwnedProgress(user.id, id)
  const input = await readValidatedBody(event, progressSchema.parse)
  await requireOwnedActionPlan(user.id, input.actionPlanId)
  // Moving the entry to another plan re-checks the old plan's status too.
  await saveProgress(user.id, id, input, existing.actionPlanId)
  return { id }
})
