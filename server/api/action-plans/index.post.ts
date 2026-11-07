import { actionPlanSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, actionPlanSchema.parse)
  const plan = await createActionPlan(user.id, input)
  setResponseStatus(event, 201)
  return plan
})
