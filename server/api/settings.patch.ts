import { eq } from 'drizzle-orm'
import { settingsSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, settingsSchema.parse)
  await ensureSettings(user.id)
  if (Object.keys(input).length) {
    await useDb().update(schema.userSettings).set(input).where(eq(schema.userSettings.userId, user.id))
  }
  return { ok: true }
})
