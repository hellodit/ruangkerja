import { and, eq, inArray } from 'drizzle-orm'

/**
 * Build (and persist) the realization draft of every RHK for one period.
 * The draft only uses recorded progress (RLS-01/02). A user's edited
 * final_text is kept; the draft text is refreshed when the source changes.
 */
export async function buildRealizations(userId: string, ws: { skp: { id: string }, periods: Period[] }, period: Period, today: string, timezone = 'Asia/Jakarta') {
  const db = useDb()
  const rhks = await listRhks(ws.skp.id)
  const plans = await listPlans(rhks.map(r => r.id), period.id, today)
  const entries = await loadProgress(userId, { order: 'asc' })
  const planIds = new Set(plans.map(p => p.id))
  const inPeriod = entries.filter(e => planIds.has(e.actionPlanId))

  const existing = rhks.length
    ? await db.select().from(schema.periodRealizations)
        .where(and(eq(schema.periodRealizations.periodId, period.id), inArray(schema.periodRealizations.rhkId, rhks.map(r => r.id))))
    : []

  const out = []
  for (const rhk of rhks) {
    const mine = plans.filter(p => p.rhkId === rhk.id)
    const sources = inPeriod.filter(e => mine.some(p => p.id === e.actionPlanId))
    const { text, excluded } = composeRealizationDraft(mine.map(p => ({
      name: p.name,
      target: p.target,
      unit: p.unit,
      realization: p.realization,
      status: p.status,
      completedAt: p.completedAt ? todayInTimeZone(timezone, new Date(p.completedAt)) : null,
      progressCount: p.progressCount,
      activities: sources.filter(s => s.actionPlanId === p.id).map(s => s.description)
    })))

    let row = existing.find(e => e.rhkId === rhk.id)
    if (!row) {
      [row] = await db.insert(schema.periodRealizations).values({ rhkId: rhk.id, periodId: period.id, draftText: text })
        .onConflictDoUpdate({ target: [schema.periodRealizations.rhkId, schema.periodRealizations.periodId], set: { draftText: text, generatedAt: new Date() } })
        .returning()
    } else if (row.draftText !== text) {
      [row] = await db.update(schema.periodRealizations).set({ draftText: text, generatedAt: new Date(), status: 'draf' })
        .where(eq(schema.periodRealizations.id, row.id)).returning()
    }
    await db.delete(schema.realizationSources).where(eq(schema.realizationSources.realizationId, row!.id))
    if (sources.length) {
      await db.insert(schema.realizationSources).values(sources.map(s => ({ realizationId: row!.id, progressId: s.id })))
    }

    const kuantitas = rhk.indicators.find(i => i.aspect === 'kuantitas') ?? rhk.indicators[0] ?? null
    out.push({
      id: row!.id,
      rhk: { id: rhk.id, number: rhk.number, statement: rhk.statement },
      indicator: kuantitas ? { indicator: kuantitas.indicator, target: kuantitas.target, unit: kuantitas.unit } : null,
      draftText: text,
      finalText: row!.finalText,
      status: row!.status,
      copiedAt: row!.copiedAt,
      sourceCount: sources.length,
      evidenceCount: sources.reduce((n, s) => n + s.results.filter(r => r.evidenceUrl).length, 0),
      excluded,
      plans: mine.map(p => ({
        id: p.id,
        name: p.name,
        target: p.target,
        unit: p.unit,
        realization: p.realization,
        evidence: sources.filter(s => s.actionPlanId === p.id).reduce((n, s) => n + s.results.filter(r => r.evidenceUrl).length, 0),
        status: p.status,
        overdue: p.overdue
      }))
    })
  }
  return { rhks: out, plans, sources: inPeriod }
}

export function realizationText(r: { draftText: string, finalText: string | null }) {
  return (r.finalText ?? r.draftText).trim()
}
