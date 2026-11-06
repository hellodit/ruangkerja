import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import { skpSchema } from '#shared/schemas/workspace'

/**
 * Create or update the SKP of a year. Periods are generated from it. Changing
 * the evaluation frequency regenerates periods, which is refused once action
 * plans exist (they belong to the old periods).
 */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, skpSchema.parse)
  const db = useDb()

  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(schema.skps).where(and(eq(schema.skps.userId, user.id), eq(schema.skps.year, input.year)))
    const drafts = generatePeriods(input.year, input.evaluationFrequency, input.submissionDeadlineDay)

    if (!existing) {
      // A new year starts a new SKP; RHKs are entered per SKP year.
      const [skp] = await tx.insert(schema.skps).values({ userId: user.id, ...input }).returning()
      await tx.insert(schema.evaluationPeriods).values(drafts.map(d => ({ ...d, skpId: skp!.id })))
      return
    }

    if (existing.evaluationFrequency !== input.evaluationFrequency) {
      const periods = await tx.select({ id: schema.evaluationPeriods.id }).from(schema.evaluationPeriods).where(eq(schema.evaluationPeriods.skpId, existing.id))
      const [used] = periods.length
        ? await tx.select({ n: count() }).from(schema.actionPlans).where(and(inArray(schema.actionPlans.periodId, periods.map(p => p.id)), isNull(schema.actionPlans.deletedAt)))
        : [{ n: 0 }]
      if ((used?.n ?? 0) > 0) {
        throw createError({ statusCode: 409, statusMessage: 'Penilaian bulanan/triwulanan tidak bisa diubah karena sudah ada rencana aksi di periode ini' })
      }
      await tx.delete(schema.evaluationPeriods).where(eq(schema.evaluationPeriods.skpId, existing.id))
      await tx.insert(schema.evaluationPeriods).values(drafts.map(d => ({ ...d, skpId: existing.id })))
    } else if (existing.submissionDeadlineDay !== input.submissionDeadlineDay) {
      for (const d of drafts) {
        await tx.update(schema.evaluationPeriods).set({ submissionDeadline: d.submissionDeadline })
          .where(and(eq(schema.evaluationPeriods.skpId, existing.id), eq(schema.evaluationPeriods.sequence, d.sequence)))
      }
    }
    await tx.update(schema.skps).set(input).where(eq(schema.skps.id, existing.id))
  })

  return await getWorkspace(user.id, today)
})
