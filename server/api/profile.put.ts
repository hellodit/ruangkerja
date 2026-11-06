import { eq } from 'drizzle-orm'
import { profileSchema } from '#shared/schemas/workspace'

export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, profileSchema.parse)
  const db = useDb()

  const values = {
    phoneWhatsapp: input.phoneWhatsapp ?? null,
    birthDate: encryptField(input.birthDate),
    gender: input.gender ?? null,
    address: encryptField(input.address),
    nip: encryptField(input.nip),
    employmentStatus: input.employmentStatus ?? null,
    rankGrade: input.rankGrade ?? null,
    positionTitle: input.positionTitle,
    workUnit: input.workUnit,
    agency: input.agency,
    supervisorName: input.supervisorName ?? null,
    supervisorTitle: input.supervisorTitle ?? null
  }

  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ name: input.name }).where(eq(schema.users.id, user.id))
    await tx.insert(schema.profiles).values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: schema.profiles.userId, set: values })
  })
  return { ok: true }
})
