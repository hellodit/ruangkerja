import { and, eq, inArray } from 'drizzle-orm'
import { markCopiedSchema } from '#shared/schemas/workspace'

/** PRG-09: e-Kinerja text for selected entries; records copied_at. */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const { ids } = await readValidatedBody(event, markCopiedSchema.parse)
  const entries = await loadProgress(user.id, { ids, order: 'asc' })
  if (!entries.length) {
    notFound('Progres harian')
  }
  await useDb().update(schema.dailyProgress).set({ copiedAt: new Date() })
    .where(and(eq(schema.dailyProgress.userId, user.id), inArray(schema.dailyProgress.id, entries.map(e => e.id))))
  return { text: formatEkinerjaCopy(entries.map(toEkinerjaEntry)), count: entries.length }
})
