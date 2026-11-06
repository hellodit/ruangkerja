import { inArray } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
  periodId: z.uuid(),
  rhkId: z.uuid().optional()
})

/** "Salin realisasi" (one RHK) / "Salin semua realisasi": text + status disalin. */
export default defineEventHandler(async (event) => {
  const { user, today, timezone } = await requireWorkspaceUser(event)
  const input = await readValidatedBody(event, bodySchema.parse)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, input.periodId)
  const { rhks } = await buildRealizations(user.id, ws, period, today, timezone)
  const chosen = rhks.filter(r => (!input.rhkId || r.rhk.id === input.rhkId) && realizationText(r))
  if (!chosen.length) {
    throw createError({ statusCode: 404, statusMessage: 'Belum ada realisasi untuk disalin' })
  }
  await useDb().update(schema.periodRealizations).set({ status: 'disalin', copiedAt: new Date() })
    .where(inArray(schema.periodRealizations.id, chosen.map(r => r.id)))
  const text = input.rhkId
    ? realizationText(chosen[0]!)
    : chosen.map(r => `RHK ${r.rhk.number}: ${r.rhk.statement}\n${realizationText(r)}`).join('\n\n')
  return { text }
})
