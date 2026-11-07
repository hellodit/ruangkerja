import { z } from 'zod'

const body = z.object({ reference: z.string().trim().max(120).optional().nullable().transform(v => v || null) })

/** Admin confirms a pending self-checkout order was paid (e.g. bank transfer received). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = await getIdParam(event)
  const input = await readValidatedBody(event, body.parse)
  const row = await activatePendingTransaction(id, { reference: input.reference, confirmedBy: admin.id })
  return { id: row.id, periodStart: row.periodStart, periodEnd: row.periodEnd }
})
