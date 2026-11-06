import { z } from 'zod'

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  rhkId: z.uuid().optional()
})

/** BKT-01/02: every result with a link, plus progress without evidence this period. */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const q = await getValidatedQuery(event, querySchema.parse)
  const ws = await getWorkspace(user.id, today)
  if (!ws) {
    return { items: [], missing: [], period: null }
  }
  const all = await loadProgress(user.id, { from: ws.periods[0]?.startDate, to: ws.periods.at(-1)?.endDate, rhkId: q.rhkId })
  const needle = q.q?.toLowerCase()
  const items = all.flatMap(p => p.results
    .filter(r => r.evidenceUrl)
    .map(r => ({
      id: r.id,
      name: r.name,
      url: r.evidenceUrl!,
      progressId: p.id,
      workDate: p.workDate,
      planName: p.plan.name,
      rhk: { id: p.rhk.id, number: p.rhk.number }
    })))
    .filter(i => !needle || i.name.toLowerCase().includes(needle) || i.planName.toLowerCase().includes(needle))
  const period = ws.current
  const missing = period
    ? all.filter(p => !p.hasEvidence && p.workDate >= period.startDate && p.workDate <= period.endDate)
        .map(p => ({ id: p.id, workDate: p.workDate, description: p.description, planName: p.plan.name, rhk: { id: p.rhk.id, number: p.rhk.number } }))
    : []
  return { items, missing, period }
})
