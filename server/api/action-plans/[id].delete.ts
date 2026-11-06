import { eq } from 'drizzle-orm'

/** Soft delete; its progress is hidden with it (joins require a live plan). */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  await requireOwnedActionPlan(user.id, id)
  await useDb().update(schema.actionPlans).set({ deletedAt: new Date() }).where(eq(schema.actionPlans.id, id))
  return { ok: true }
})
