import { progressSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, progressSchema.parse)
  await requireOwnedActionPlan(user.id, input.actionPlanId)
  const id = await saveProgress(user.id, null, input)
  setResponseStatus(event, 201)
  return { id }
})
