import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const id = await getIdParam(event)
  const dp = schema.dailyProgress
  const [row] = await useDb().update(dp).set({ deletedAt: new Date() })
    .where(and(eq(dp.id, id), eq(dp.userId, user.id), isNull(dp.deletedAt)))
    .returning({ id: dp.id })
  if (!row) notFound('Progres harian')
  return { ok: true }
})
