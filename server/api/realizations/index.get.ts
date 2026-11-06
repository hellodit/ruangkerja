/** RLS-01..03: realization drafts of every RHK for a period. */
export default defineEventHandler(async (event) => {
  const { user, today, timezone } = await requireWorkspaceUser(event)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, getQuery(event).periodId)
  const { rhks, plans, sources } = await buildRealizations(user.id, ws, period, today, timezone)
  return {
    period,
    periods: ws.periods,
    today,
    daysToDeadline: daysBetween(today, period.submissionDeadline),
    totals: {
      plans: plans.length,
      done: plans.filter(p => p.status === 'selesai').length,
      progress: sources.length,
      evidence: sources.reduce((n, s) => n + s.results.filter(r => r.evidenceUrl).length, 0)
    },
    rhks
  }
})
