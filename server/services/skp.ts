import { and, eq, isNull, sql } from 'drizzle-orm'

type SkpInput = ReturnType<typeof import('#shared/schemas/workspace').skpSchema.parse>

/**
 * Create or update the SKP of a year and its generated periods, in one
 * transaction. Changing the evaluation frequency regenerates the periods,
 * refused once live action plans use them; changing the deadline day moves
 * every period's deadline in one UPDATE.
 */
export async function saveSkp(userId: string, input: SkpInput) {
  await useDb().transaction(async (tx) => {
    const ap = schema.actionPlans
    const ep = schema.evaluationPeriods
    // Live plans per period of this SKP, aggregated and left-joined (joined
    // columns are qualified, so the count cannot bind to the wrong "id").
    const used = tx.select({ skpId: ep.skpId, n: sql<number>`count(*)::int`.as('n') })
      .from(ap)
      .innerJoin(ep, eq(ep.id, ap.periodId))
      .innerJoin(schema.skps, eq(schema.skps.id, ep.skpId))
      .where(and(isNull(ap.deletedAt), eq(schema.skps.userId, userId), eq(schema.skps.year, input.year)))
      .groupBy(ep.skpId)
      .as('used')
    const [existing] = await tx.select({
      id: schema.skps.id,
      evaluationFrequency: schema.skps.evaluationFrequency,
      submissionDeadlineDay: schema.skps.submissionDeadlineDay,
      usedPlans: sql<number>`coalesce(${used.n}, 0)`.mapWith(Number)
    }).from(schema.skps)
      .leftJoin(used, eq(used.skpId, schema.skps.id))
      .where(and(eq(schema.skps.userId, userId), eq(schema.skps.year, input.year)))
    const drafts = generatePeriods(input.year, input.evaluationFrequency, input.submissionDeadlineDay)

    if (!existing) {
      // A new year starts a new SKP; RHKs are entered per SKP year.
      const [skp] = await tx.insert(schema.skps).values({ userId, ...input }).returning({ id: schema.skps.id })
      await tx.insert(ep).values(drafts.map(d => ({ ...d, skpId: skp!.id })))
      return
    }

    if (existing.evaluationFrequency !== input.evaluationFrequency) {
      if (existing.usedPlans > 0) {
        throw createError({ statusCode: 409, statusMessage: 'Penilaian bulanan/triwulanan tidak bisa diubah karena sudah ada rencana aksi di periode ini' })
      }
      await tx.delete(ep).where(eq(ep.skpId, existing.id))
      await tx.insert(ep).values(drafts.map(d => ({ ...d, skpId: existing.id })))
    } else if (existing.submissionDeadlineDay !== input.submissionDeadlineDay) {
      const cases = sql.join(drafts.map(d => sql`when ${d.sequence} then ${d.submissionDeadline}::date`), sql` `)
      await tx.update(ep)
        .set({ submissionDeadline: sql`case ${ep.sequence} ${cases} else ${ep.submissionDeadline} end` })
        .where(eq(ep.skpId, existing.id))
    }
    await tx.update(schema.skps).set(input).where(eq(schema.skps.id, existing.id))
  })
}
