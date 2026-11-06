import { MONTHS_SHORT_ID } from './dates'

export type EvaluationFrequency = 'monthly' | 'quarterly'

export interface PeriodDraft {
  sequence: number
  label: string
  startDate: string
  endDate: string
  submissionDeadline: string
}

const pad = (n: number) => String(n).padStart(2, '0')

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Evaluation periods of one SKP year. The submission deadline is day
 * `deadlineDay` of the month after the period ends (BKN e-Kinerja practice).
 */
export function generatePeriods(year: number, frequency: EvaluationFrequency, deadlineDay: number): PeriodDraft[] {
  const months = frequency === 'monthly' ? 1 : 3
  const count = 12 / months
  return Array.from({ length: count }, (_, i) => {
    const startMonth = i * months + 1
    const endMonth = startMonth + months - 1
    const nextMonth = endMonth === 12 ? 1 : endMonth + 1
    const nextYear = endMonth === 12 ? year + 1 : year
    return {
      sequence: i + 1,
      label: frequency === 'monthly' ? `Bulanan ${i + 1}` : `Triwulan ${i + 1}`,
      startDate: `${year}-${pad(startMonth)}-01`,
      endDate: `${year}-${pad(endMonth)}-${pad(lastDayOfMonth(year, endMonth))}`,
      submissionDeadline: `${nextYear}-${pad(nextMonth)}-${pad(deadlineDay)}`
    }
  })
}

export function findCurrentPeriod<T extends { startDate: string, endDate: string }>(periods: T[], today: string): T | undefined {
  return periods.find(p => p.startDate <= today && today <= p.endDate)
}

/** "Bulanan 11 · Nov 2026" */
export function periodShortLabel(p: { label: string, startDate: string, endDate: string }): string {
  const s = p.startDate.slice(0, 7)
  const e = p.endDate.slice(0, 7)
  const [sy, sm] = s.split('-').map(Number) as [number, number]
  const [, em] = e.split('-').map(Number) as [number, number]
  const months = sm === em ? MONTHS_SHORT_ID[sm - 1] : `${MONTHS_SHORT_ID[sm - 1]}–${MONTHS_SHORT_ID[em - 1]}`
  return `${p.label} · ${months} ${sy}`
}
