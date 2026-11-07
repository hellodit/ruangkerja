/**
 * Date helpers working on plain ISO date strings ('YYYY-MM-DD') and times
 * ('HH:MM' or 'HH:MM:SS'). Work dates are stored in the user's timezone, so all
 * arithmetic is done in UTC on calendar dates to avoid DST/offset drift.
 */
const DAY_MS = 86_400_000

export const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const DAYS_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(parse(iso).getTime() + days * DAY_MS))
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS)
}

export function dayOfWeek(iso: string): number {
  return parse(iso).getUTCDay()
}

/** Monday–Friday of the work week containing `iso` (weekends map to the preceding week). */
export function weekRange(iso: string): { start: string, end: string } {
  const dow = dayOfWeek(iso)
  const offset = dow === 0 ? 6 : dow - 1
  const start = addDays(iso, -offset)
  return { start, end: addDays(start, 4) }
}

export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  }
}

/** "Jumat, 6 November 2026" */
export function formatDateLong(iso: string): string {
  const d = parse(iso)
  return `${DAYS_ID[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "6 November 2026" */
export function formatDate(iso: string): string {
  const d = parse(iso)
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "Jum, 6 Nov" */
export function formatDateShort(iso: string): string {
  const d = parse(iso)
  return `${DAYS_SHORT_ID[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_SHORT_ID[d.getUTCMonth()]}`
}

/** "6 Nov" */
export function formatDayMonth(iso: string): string {
  const d = parse(iso)
  return `${d.getUTCDate()} ${MONTHS_SHORT_ID[d.getUTCMonth()]}`
}

/** "13:30:00" → "13.30" (Indonesian time notation). */
export function formatTime(time: string): string {
  return time.slice(0, 5).replace(':', '.')
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number]
  return h * 60 + m
}

export function minutesBetween(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}

/** 270 → "4 j 30 m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) {
    return `${h} j ${m} m`
  }
  return h ? `${h} j` : `${m} m`
}

/** "2–6 November 2026", or across months "30 November – 4 Desember 2026". */
export function formatRange(start: string, end: string): string {
  const a = parse(start)
  const b = parse(end)
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_ID[b.getUTCMonth()]} ${b.getUTCFullYear()}`
  }
  return `${a.getUTCDate()} ${MONTHS_ID[a.getUTCMonth()]} – ${formatDate(end)}`
}

/** "Hari ini", "Kemarin", "3 hari lalu", then a short date (for "last active"). */
export function formatDaysAgo(at: string | Date, today: string, timeZone = 'Asia/Jakarta'): string {
  const day = todayInTimeZone(timeZone, typeof at === 'string' ? new Date(at) : at)
  const diff = daysBetween(day, today)
  if (diff <= 0) return 'Hari ini'
  if (diff === 1) return 'Kemarin'
  if (diff < 7) return `${diff} hari lalu`
  return formatDateShort(day)
}
