/** Money and package-period helpers shared by the admin UI and API. */

const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })

/** 150000 → "Rp 150.000" (regular space, so it can be searched and copied). */
export function formatRupiah(amount: number): string {
  return RUPIAH.format(amount).replace(/\s/g, ' ')
}

/** 30 → "30 hari", 365 → "1 tahun", 90 → "3 bulan" (exact multiples only). */
export function formatDurationDays(days: number): string {
  if (days % 365 === 0) return `${days / 365} tahun`
  if (days % 30 === 0) return `${days / 30} bulan`
  return `${days} hari`
}

export type PeriodStart = 'extend' | 'now'

/**
 * The period a newly assigned package covers. "extend" continues after the
 * user's current active period (no days lost when renewing early); "now"
 * starts immediately (e.g. upgrading to a different package).
 */
export function computePackagePeriod(opts: { now: Date, currentEnd: Date | null, durationDays: number, start: PeriodStart }): { start: Date, end: Date } {
  const start = opts.start === 'extend' && opts.currentEnd && opts.currentEnd > opts.now ? opts.currentEnd : opts.now
  return { start, end: new Date(start.getTime() + opts.durationDays * 24 * 60 * 60 * 1000) }
}

const COMPACT = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })

/** Axis labels: 1250000 → "Rp 1,3 jt", 49000 → "Rp 49 rb". */
export function formatRupiahCompact(amount: number): string {
  return `Rp ${COMPACT.format(amount).replace(/\s/g, ' ')}`
}

/** A round axis maximum ≥ n: 1, 2, 5 × 10^k (never below 1). */
export function niceMax(n: number): number {
  if (n <= 1) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 5, 10].map(m => m * p).find(v => v >= n)!
}
