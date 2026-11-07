import { actionPlanUpdateSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, actionPlanUpdateSchema.parse)
  return updateActionPlan(user.id, id, input)
})
