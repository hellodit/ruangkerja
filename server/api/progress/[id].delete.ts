import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await requireOwnedProgress(user.id, id)
  await useDb().update(schema.dailyProgress).set({ deletedAt: new Date() }).where(eq(schema.dailyProgress.id, id))
  return { ok: true }
})
