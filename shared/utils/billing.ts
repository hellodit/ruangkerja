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

/**
 * The period a newly paid package covers: it continues right after the
 * user's current paid coverage (so renewing early loses no days), or starts
 * now when nothing is active. End = start + the package's duration.
 */
export function computePackagePeriod(opts: { now: Date, currentEnd: Date | null, durationDays: number }): { start: Date, end: Date } {
  const start = opts.currentEnd && opts.currentEnd > opts.now ? opts.currentEnd : opts.now
  return { start, end: new Date(start.getTime() + opts.durationDays * DAY_MS) }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days left until `end` (rounded up: 2.1 days left reads as 3). 0 once expired. */
export function daysLeft(end: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
}

/** Renewal reminder window: the dashboard warns this many days before the package ends. */
export const RENEWAL_NOTICE_DAYS = 7

/** Order code written in the transfer note: RK-YYMMDD-XXXXXX (no 0/O/1/I to avoid misreading). */
export function orderCode(day: string, random: Uint8Array): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const suffix = Array.from(random.slice(0, 6), b => alphabet[b % alphabet.length]).join('')
  return `RK-${day.slice(2, 4)}${day.slice(5, 7)}${day.slice(8, 10)}-${suffix}`
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
