import { z } from 'zod'

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rhkId: z.uuid().optional(),
  actionPlanId: z.uuid().optional(),
  noEvidence: z.enum(['1', 'true']).optional()
})

/** PRG-02/03: progress entries for a date range (default: this work week). */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const week = weekRange(today)
  const entries = await loadProgress(user.id, {
    from: q.from ?? week.start,
    to: q.to ?? week.end,
    rhkId: q.rhkId,
    actionPlanId: q.actionPlanId
  })
  return {
    today,
    from: q.from ?? week.start,
    to: q.to ?? week.end,
    entries: q.noEvidence ? entries.filter(e => !e.hasEvidence) : entries
  }
})
