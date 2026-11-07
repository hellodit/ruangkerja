import { skpSchema } from '#shared/schemas/workspace'

/**
 * Create or update the SKP of a year. Periods are generated from it. Changing
 * the evaluation frequency regenerates periods, which is refused once action
 * plans exist (they belong to the old periods).
 */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, skpSchema.parse)
  await saveSkp(user.id, input)
  return await getWorkspace(user.id, today)
})
