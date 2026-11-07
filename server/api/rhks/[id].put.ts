import { rhkSchema } from '#shared/schemas/workspace'

/** RHK-06: edit anytime. This never changes the official SKP. */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, rhkSchema.parse)
  await updateRhk(user.id, id, input)
  return { ok: true }
})
