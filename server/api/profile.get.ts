import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const p = await useDb().query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) })
  return {
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    phoneWhatsapp: p?.phoneWhatsapp ?? '',
    birthDate: p?.birthDate ?? '',
    gender: p?.gender ?? undefined,
    address: p?.address ?? '',
    nip: p?.nip ?? '',
    employmentStatus: p?.employmentStatus ?? undefined,
    rankGrade: p?.rankGrade ?? '',
    positionTitle: p?.positionTitle ?? '',
    workUnit: p?.workUnit ?? '',
    agency: p?.agency ?? '',
    supervisorName: p?.supervisorName ?? '',
    supervisorTitle: p?.supervisorTitle ?? ''
  }
})
