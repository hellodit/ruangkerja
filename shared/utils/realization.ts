import { formatDate } from './dates'
import { formatNumber, type ActionPlanStatus } from './plans'

export interface RealizationPlanInput {
  name: string
  target: number
  unit: string
  realization: number
  status: ActionPlanStatus
  /** ISO date or null */
  completedAt: string | null
  progressCount: number
  /** Progress descriptions, oldest first */
  activities: string[]
}

/**
 * Draft realization narrative for one RHK in one period, built ONLY from the
 * user's own progress entries (RLS-01/02): no invented facts, no numbers that
 * were not recorded. Plans without progress are excluded and reported.
 */
export function composeRealizationDraft(plans: RealizationPlanInput[]): { text: string, excluded: string[] } {
  const included = plans.filter(p => p.progressCount > 0)
  const excluded = plans.filter(p => p.progressCount === 0).map(p => p.name)

  const paragraphs = included.map((p) => {
    const state = p.status === 'selesai'
      ? (p.completedAt ? `selesai ${formatDate(p.completedAt)}` : 'selesai')
      : 'masih berjalan'
    const head = `${p.name}: realisasi ${formatNumber(p.realization)} dari ${formatNumber(p.target)} ${p.unit}, ${state}.`
    const acts = p.activities
      .map(a => a.trim().replace(/[.;]+$/, ''))
      .filter(Boolean)
    return acts.length ? `${head} Kegiatan: ${acts.join('; ')}.` : head
  })

  return { text: paragraphs.join('\n\n'), excluded }
}
