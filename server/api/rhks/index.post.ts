import { rhkSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, rhkSchema.parse)
  const rhk = await createRhk(user.id, today, input)
  setResponseStatus(event, 201)
  return rhk
})
