import { rhkBulkSchema } from '#shared/schemas/workspace'

/** Paste several RHK statements copied from an approved SKP (one per line). */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, rhkBulkSchema.parse)
  const created = await createRhksBulk(user.id, today, input)
  setResponseStatus(event, 201)
  return { created }
})
