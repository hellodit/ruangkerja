import type { H3Event } from 'h3'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { RealizationReport } from '../utils/realization-docx'

/**
 * Build (and persist) the realization draft of every RHK for one period.
 * The draft only uses recorded progress (RLS-01/02). A user's edited
 * final_text is kept; the draft text is refreshed when the source changes.
 *
 * Reads: one relational query (RHKs → indicators, the period's live plans with
 * derived values, the period's stored realization with its sources) and one
 * for the progress of those plans. Writes happen only when a draft or its
 * source list changed, inside one transaction.
 */
export async function buildRealizations(userId: string, ws: { skp: { id: string } }, period: Period, today: string, timezone = 'Asia/Jakarta') {
  const db = useDb()
  const rows = await db.query.rhks.findMany({
    where: and(eq(schema.rhks.skpId, ws.skp.id), isNull(schema.rhks.deletedAt)),
    orderBy: asc(schema.rhks.number),
    with: {
      indicators: { orderBy: (i, { asc }) => [asc(i.position)] },
      actionPlans: livePlansIn(period.id),
      realizations: {
        where: (r, { eq }) => eq(r.periodId, period.id),
        with: { sources: { columns: { progressId: true } } }
      }
    }
  })
  const rhks = rows.map(({ actionPlans, realizations, ...rhk }) => ({
    ...rhk,
    plans: actionPlans.map(p => withPlanStats(p, today)),
    stored: realizations[0] ?? null
  }))
  const plans = rhks.flatMap(r => r.plans)
  const inPeriod = await loadProgress(userId, { actionPlanIds: plans.map(p => p.id), order: 'asc' })

  const drafts = rhks.map((rhk) => {
    const planIds = new Set(rhk.plans.map(p => p.id))
    const sources = inPeriod.filter(e => planIds.has(e.actionPlanId))
    const { text, excluded } = composeRealizationDraft(rhk.plans.map(p => ({
      name: p.name,
      target: p.target,
      unit: p.unit,
      realization: p.realization,
      status: p.status,
      completedAt: p.completedAt ? todayInTimeZone(timezone, new Date(p.completedAt)) : null,
      progressCount: p.progressCount,
      activities: sources.filter(s => s.actionPlanId === p.id).map(s => s.description)
    })))
    return { rhk, sources, text, excluded }
  })

  const saved = await persistDrafts(period.id, drafts)

  const out = drafts.map(({ rhk, sources, text, excluded }) => {
    const row = saved.get(rhk.id)!
    const kuantitas = rhk.indicators.find(i => i.aspect === 'kuantitas') ?? rhk.indicators[0] ?? null
    const evidenceOf = (s: ProgressEntry) => s.results.filter(r => r.evidenceUrl)
    return {
      id: row.id,
      rhk: { id: rhk.id, number: rhk.number, statement: rhk.statement, type: rhk.type },
      indicators: rhk.indicators.map(i => ({ aspect: i.aspect, indicator: i.indicator, target: i.target, unit: i.unit })),
      indicator: kuantitas ? { indicator: kuantitas.indicator, target: kuantitas.target, unit: kuantitas.unit } : null,
      draftText: text,
      finalText: row.finalText,
      status: row.status,
      copiedAt: row.copiedAt,
      sourceCount: sources.length,
      // RLS-01: the progress entries the draft was built from.
      sources: sources.map(src => ({
        id: src.id,
        workDate: src.workDate,
        startTime: src.startTime,
        endTime: src.endTime,
        planName: src.plan.name,
        description: src.description,
        realization: src.realization,
        unit: src.plan.unit,
        evidenceCount: evidenceOf(src).length,
        evidence: evidenceOf(src).map(r => ({ name: r.name, url: r.evidenceUrl! }))
      })),
      evidenceCount: sources.reduce((n, s) => n + evidenceOf(s).length, 0),
      excluded,
      plans: rhk.plans.map(p => ({
        id: p.id,
        name: p.name,
        target: p.target,
        unit: p.unit,
        realization: p.realization,
        evidence: sources.filter(s => s.actionPlanId === p.id).reduce((n, s) => n + evidenceOf(s).length, 0),
        status: p.status,
        overdue: p.overdue
      }))
    }
  })
  return { rhks: out, plans, sources: inPeriod }
}

type StoredRealization = typeof schema.periodRealizations.$inferSelect

/**
 * Write what changed: new realization rows (one insert), refreshed drafts
 * (status back to draf) and changed source lists (one delete + one insert).
 * Returns the stored row per RHK id.
 */
async function persistDrafts(
  periodId: string,
  drafts: { rhk: { id: string, stored: (StoredRealization & { sources: { progressId: string }[] }) | null }, sources: { id: string }[], text: string }[]
) {
  const saved = new Map<string, StoredRealization>()
  const sameSources = (d: typeof drafts[number]) => {
    const stored = d.rhk.stored?.sources.map(s => s.progressId).sort() ?? []
    const now = d.sources.map(s => s.id).sort()
    return stored.length === now.length && stored.every((id, i) => id === now[i])
  }
  const toInsert = drafts.filter(d => !d.rhk.stored)
  const toRefresh = drafts.filter(d => d.rhk.stored && d.rhk.stored.draftText !== d.text)
  const toRelink = drafts.filter(d => !sameSources(d))
  for (const d of drafts) {
    if (d.rhk.stored) saved.set(d.rhk.id, d.rhk.stored)
  }
  if (!toInsert.length && !toRefresh.length && !toRelink.length) {
    return saved
  }

  const pr = schema.periodRealizations
  await useDb().transaction(async (tx) => {
    if (toInsert.length) {
      const inserted = await tx.insert(pr).values(toInsert.map(d => ({ rhkId: d.rhk.id, periodId, draftText: d.text })))
        .onConflictDoUpdate({ target: [pr.rhkId, pr.periodId], set: { draftText: sql`excluded.draft_text`, generatedAt: sql`now()` } })
        .returning()
      for (const row of inserted) saved.set(row.rhkId, row)
    }
    for (const d of toRefresh) {
      const [row] = await tx.update(pr).set({ draftText: d.text, generatedAt: new Date(), status: 'draf' })
        .where(eq(pr.id, d.rhk.stored!.id)).returning()
      saved.set(d.rhk.id, row!)
    }
    if (toRelink.length) {
      const ids = toRelink.map(d => saved.get(d.rhk.id)!.id)
      await tx.delete(schema.realizationSources).where(inArray(schema.realizationSources.realizationId, ids))
      const links = toRelink.flatMap(d => d.sources.map(s => ({ realizationId: saved.get(d.rhk.id)!.id, progressId: s.id })))
      if (links.length) {
        // A concurrent rebuild may have linked the same pair already.
        await tx.insert(schema.realizationSources).values(links).onConflictDoNothing()
      }
    }
  })
  return saved
}

export function realizationText(r: { draftText: string, finalText: string | null }) {
  return (r.finalText ?? r.draftText).trim()
}

/** Collect everything the Word and PDF exports print for one period (RLS-03). */
export async function loadRealizationReport(event: H3Event): Promise<RealizationReport> {
  const { user, today, timezone } = await requireWorkspaceUser(event)
  const ws = await requireWorkspace(user.id, today)
  const period = pickPeriod(ws, getQuery(event).periodId)
  const { rhks } = await buildRealizations(user.id, ws, period, today, timezone)
  const profile = await useDb().query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) })

  return {
    period,
    skpYear: ws.skp.year,
    generatedOn: today,
    privacyUrl: `${useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')}/privasi`,
    person: {
      name: user.name,
      nip: profile?.nip,
      rankGrade: profile?.rankGrade,
      positionTitle: profile?.positionTitle,
      workUnit: profile?.workUnit,
      agency: profile?.agency,
      supervisorName: profile?.supervisorName,
      supervisorTitle: profile?.supervisorTitle
    },
    rhks: rhks.map(r => ({
      number: r.rhk.number,
      type: r.rhk.type,
      statement: r.rhk.statement,
      indicators: r.indicators,
      text: realizationText(r),
      plans: r.plans,
      sources: r.sources,
      excluded: r.excluded
    }))
  }
}
