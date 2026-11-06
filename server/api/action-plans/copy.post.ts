import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
  rhkId: z.uuid(),
  fromPeriodId: z.uuid(),
  toPeriodId: z.uuid()
})

/**
 * RHK-03 "Salin dari periode sebelumnya": copy plans of one RHK to another
 * period, reset to Belum dimulai, due date moved to the same offset in the
 * target period (clamped to its end).
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, bodySchema.parse)
  const { skp } = await requireOwnedRhk(user.id, input.rhkId)
  const from = await requireOwnedPeriod(user.id, input.fromPeriodId)
  const to = await requireOwnedPeriod(user.id, input.toPeriodId)
  if (from.skpId !== skp.id || to.skpId !== skp.id || from.id === to.id) {
    throw createError({ statusCode: 422, statusMessage: 'Periode tidak valid' })
  }
  const db = useDb()
  const source = await db.select().from(schema.actionPlans)
    .where(and(eq(schema.actionPlans.rhkId, input.rhkId), eq(schema.actionPlans.periodId, from.id), isNull(schema.actionPlans.deletedAt)))
    .orderBy(asc(schema.actionPlans.position))
  if (!source.length) {
    throw createError({ statusCode: 404, statusMessage: 'Tidak ada rencana aksi di periode sebelumnya' })
  }
  const shift = (due: string) => {
    const moved = addDays(to.startDate, Math.max(0, daysBetween(from.startDate, due)))
    return moved > to.endDate ? to.endDate : moved
  }
  const created = await db.insert(schema.actionPlans).values(source.map((p, i) => ({
    rhkId: p.rhkId,
    periodId: to.id,
    name: p.name,
    target: p.target,
    unit: p.unit,
    dueDate: shift(p.dueDate),
    copiedFromId: p.id,
    position: i
  }))).returning({ id: schema.actionPlans.id })
  return { created: created.length }
})
