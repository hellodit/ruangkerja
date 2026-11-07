/**
 * BRD-01..03: read-only overview of the current period. Three queries: the
 * workspace, the RHKs with this period's plans (derived values included) and
 * the progress covering both this work week and the period.
 */
export async function getDashboard(user: { id: string, name: string }, today: string) {
  const ws = await getWorkspace(user.id, today)
  if (!ws || !ws.current) {
    return { ready: false as const, name: user.name, today }
  }
  const period = ws.current
  const { rhks, plans } = await listRhksWithPlans(ws.skp.id, period.id, today)
  const week = weekRange(today)
  const entries = await loadProgress(user.id, {
    from: week.start < period.startDate ? week.start : period.startDate,
    to: week.end > period.endDate ? week.end : period.endDate,
    order: 'asc'
  })
  const weekEntries = entries.filter(e => e.workDate >= week.start && e.workDate <= week.end)
  const periodEntries = entries.filter(e => e.workDate >= period.startDate && e.workDate <= period.endDate)

  const days = Array.from({ length: 5 }, (_, i) => addDays(week.start, i))
  const workdaysSoFar = days.filter(d => d <= today)
  const perDay = days.map(d => ({ date: d, count: weekEntries.filter(e => e.workDate === d).length }))

  const missingEvidence = periodEntries.filter(e => !e.hasEvidence).length
  const evidenceCount = periodEntries.reduce((n, e) => n + e.results.filter(r => r.evidenceUrl).length, 0)
  const open = plans.filter(p => p.status !== 'selesai')
  const priority = [...open].sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate)).slice(0, 5)

  return {
    ready: true as const,
    name: user.name,
    today,
    period,
    daysToDeadline: daysBetween(today, period.submissionDeadline),
    plans: {
      total: plans.length,
      done: plans.filter(p => p.status === 'selesai').length,
      running: plans.filter(p => p.status === 'berjalan').length,
      notStarted: plans.filter(p => p.status === 'belum_dimulai').length,
      overdue: plans.filter(p => p.overdue).length
    },
    week: {
      ...week,
      count: weekEntries.length,
      daysWithEntries: workdaysSoFar.filter(d => weekEntries.some(e => e.workDate === d)).length,
      workdaysSoFar: workdaysSoFar.length,
      perDay
    },
    evidence: { count: evidenceCount, missing: missingEvidence },
    priority: priority.map(p => ({
      id: p.id,
      name: p.name,
      rhkId: p.rhkId,
      rhkNumber: rhks.find(r => r.id === p.rhkId)?.number ?? 0,
      realization: p.realization,
      target: p.target,
      unit: p.unit,
      achievement: p.achievement,
      dueDate: p.dueDate,
      status: p.status,
      overdue: p.overdue
    })),
    todayEntries: weekEntries.filter(e => e.workDate === today).map(e => ({
      id: e.id,
      startTime: e.startTime,
      endTime: e.endTime,
      description: e.description,
      planName: e.plan.name,
      evidenceCount: e.results.filter(r => r.evidenceUrl).length,
      ekinerja: toEkinerjaEntry(e)
    })),
    perRhk: rhks.map(r => ({
      id: r.id,
      number: r.number,
      statement: r.statement,
      done: r.plans.filter(p => p.status === 'selesai').length,
      total: r.plans.length
    }))
  }
}
