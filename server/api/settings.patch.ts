import { settingsSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, settingsSchema.parse)
  await updateSettings(user.id, input)
  return { ok: true }
})
