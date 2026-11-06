export type ActionPlanStatus = 'belum_dimulai' | 'berjalan' | 'selesai'

export const PLAN_STATUS_LABELS: Record<ActionPlanStatus, string> = {
  belum_dimulai: 'Belum dimulai',
  berjalan: 'Berjalan',
  selesai: 'Selesai'
}

export function planStatusLabel(status: ActionPlanStatus): string {
  return PLAN_STATUS_LABELS[status]
}

/** Due date before today (user timezone) and not done. */
export function isOverdue(plan: { dueDate: string, status: ActionPlanStatus }, today: string): boolean {
  return plan.status !== 'selesai' && plan.dueDate < today
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)
}

/** 0–100, capped. */
export function achievementPercent(realization: number, target: number): number {
  if (target <= 0) {
    return 0
  }
  return Math.min(100, Math.round((realization / target) * 100))
}

export const ASPECT_LABELS = {
  kuantitas: 'Kuantitas',
  kualitas: 'Kualitas',
  waktu: 'Waktu',
  biaya: 'Biaya'
} as const

export const RHK_TYPE_LABELS = {
  utama: 'Utama',
  tambahan: 'Tambahan'
} as const

export const CATEGORY_LABELS = {
  biasa: 'Biasa',
  perlu_diskusi: 'Perlu diskusi dengan atasan'
} as const
