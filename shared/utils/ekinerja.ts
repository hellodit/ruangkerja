import { formatDateLong, formatTime } from './dates'
import { formatNumber } from './plans'

export interface EkinerjaEntry {
  actionPlan: string
  workDate: string
  startTime: string
  endTime: string
  description: string
  realization: number
  unit: string
  evidenceUrls: string[]
}

/**
 * Text ready to paste into e-Kinerja's progres harian form, in its field
 * order: rencana aksi, tanggal, jam, uraian, realisasi, tautan bukti (PRG-09).
 */
export function formatEkinerjaCopy(entries: EkinerjaEntry[]): string {
  return entries.map(e => [
    `Rencana aksi: ${e.actionPlan}`,
    `Tanggal: ${formatDateLong(e.workDate)}`,
    `Jam: ${formatTime(e.startTime)}–${formatTime(e.endTime)}`,
    `Uraian: ${e.description}`,
    `Realisasi: ${formatNumber(e.realization)} ${e.unit}`,
    `Tautan bukti: ${e.evidenceUrls.length ? e.evidenceUrls.join(', ') : '-'}`
  ].join('\n')).join('\n\n')
}
