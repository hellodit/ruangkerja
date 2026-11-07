/**
 * Action plans grouped by RHK for the period containing ?date= (default
 * today) — feeds the progress form's selector (PRG-05).
 */
export default defineEventHandler(async (event) => {
  const { user, today } = await requireWorkspaceUser(event)
  const ws = await requireWorkspace(user.id, today)
  const q = getQuery(event)
  const date = typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : today
  const period = typeof q.periodId === 'string' ? pickPeriod(ws, q.periodId) : (findCurrentPeriod(ws.periods, date) ?? ws.current)
  const { rhks } = await listRhksWithPlans(ws.skp.id, period.id, today)
  return {
    period,
    groups: rhks
      .map(r => ({ rhk: { id: r.id, number: r.number, statement: r.statement }, plans: r.plans }))
      .filter(g => g.plans.length)
  }
})
