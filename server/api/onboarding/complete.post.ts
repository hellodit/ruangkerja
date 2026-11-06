import { and, count, eq, isNull } from 'drizzle-orm'

/** ONB-05: finish onboarding once profile essentials, SKP and ≥1 RHK exist. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const db = useDb()
  const [p] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id))
  if (!p?.positionTitle || !p.workUnit || !p.agency) {
    throw createError({ statusCode: 409, statusMessage: 'Lengkapi jabatan, unit kerja, dan instansi di langkah Isi profil' })
  }
  const ws = await getWorkspace(user.id, today)
  if (!ws) {
    throw createError({ statusCode: 409, statusMessage: 'Atur periode evaluasi di langkah RHK' })
  }
  const [r] = await db.select({ n: count() }).from(schema.rhks).where(and(eq(schema.rhks.skpId, ws.skp.id), isNull(schema.rhks.deletedAt)))
  if (!r?.n) {
    throw createError({ statusCode: 409, statusMessage: 'Simpan minimal satu RHK' })
  }
  await ensureSettings(user.id)
  await db.update(schema.users).set({ onboardingCompletedAt: new Date() }).where(eq(schema.users.id, user.id))
  return { ok: true }
})
