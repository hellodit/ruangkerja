import { describe, expect, it } from 'vitest'
import { computePackagePeriod, formatDurationDays, formatRupiah } from '../../shared/utils/billing'
import { assignPackageSchema, packageSchema } from '../../shared/schemas/admin'

const DAY = 24 * 60 * 60 * 1000

describe('formatRupiah', () => {
  it('formats whole rupiah with dot thousands', () => {
    expect(formatRupiah(150000)).toBe('Rp 150.000')
    expect(formatRupiah(0)).toBe('Rp 0')
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000')
  })
})

describe('formatDurationDays', () => {
  it('uses years and months only for exact multiples', () => {
    expect(formatDurationDays(365)).toBe('1 tahun')
    expect(formatDurationDays(90)).toBe('3 bulan')
    expect(formatDurationDays(30)).toBe('1 bulan')
    expect(formatDurationDays(45)).toBe('45 hari')
  })
})

describe('computePackagePeriod', () => {
  const now = new Date('2026-11-07T03:00:00Z')

  it('starts now when the user has no active period', () => {
    const p = computePackagePeriod({ now, currentEnd: null, durationDays: 30 })
    expect(p.start).toEqual(now)
    expect(p.end.getTime() - now.getTime()).toBe(30 * DAY)
  })

  it('adds the duration after the current end so no paid days are lost', () => {
    const currentEnd = new Date('2026-11-20T00:00:00Z')
    const p = computePackagePeriod({ now, currentEnd, durationDays: 30 })
    expect(p.start).toEqual(currentEnd)
    expect(p.end).toEqual(new Date(currentEnd.getTime() + 30 * DAY))
  })

  it('ignores an expired period', () => {
    expect(computePackagePeriod({ now, currentEnd: new Date('2026-10-01T00:00:00Z'), durationDays: 7 }).start).toEqual(now)
  })
})

describe('daysLeft and orderCode', () => {
  it('rounds the days left up and stops at 0', async () => {
    const { daysLeft } = await import('../../shared/utils/billing')
    const now = new Date('2026-11-07T03:00:00Z')
    expect(daysLeft(new Date('2026-11-14T03:00:00Z'), now)).toBe(7)
    expect(daysLeft(new Date('2026-11-09T06:00:00Z'), now)).toBe(3)
    expect(daysLeft(new Date('2026-11-01T00:00:00Z'), now)).toBe(0)
  })

  it('builds a readable order code from the WIB day and random bytes', async () => {
    const { orderCode } = await import('../../shared/utils/billing')
    expect(orderCode('2026-11-07', new Uint8Array([0, 1, 31, 32, 2, 3]))).toBe('RK-261107-AB9ACD')
    expect(orderCode('2026-11-07', new Uint8Array([200, 7, 99, 250, 18, 77]))).toMatch(/^RK-261107-[A-HJ-NP-Z2-9]{6}$/)
  })
})

describe('package and assign schemas', () => {
  it('validates packages', () => {
    expect(packageSchema.parse({ name: ' Pro Bulanan ', price: 49000, durationDays: 30 })).toEqual({ name: 'Pro Bulanan', description: null, price: 49000, durationDays: 30, isActive: true })
    expect(packageSchema.safeParse({ name: 'X', price: 49000, durationDays: 30 }).success).toBe(false)
    expect(packageSchema.safeParse({ name: 'Pro', price: -1, durationDays: 30 }).success).toBe(false)
    expect(packageSchema.safeParse({ name: 'Pro', price: 10.5, durationDays: 30 }).success).toBe(false)
    expect(packageSchema.safeParse({ name: 'Pro', price: 1000, durationDays: 0 }).success).toBe(false)
  })

  it('validates manual assignments', () => {
    const ok = assignPackageSchema.parse({ userId: '6a475d92-b0a5-40b8-92c0-c681d28a97a2', packageId: '7b475d92-b0a5-40b8-92c0-c681d28a97a2', amount: 0, reference: '  ', notes: 'Promo' })
    expect(ok).toMatchObject({ amount: 0, reference: null, notes: 'Promo' })
    expect(assignPackageSchema.safeParse({ userId: 'x', packageId: '7b475d92-b0a5-40b8-92c0-c681d28a97a2', amount: 0 }).success).toBe(false)
  })
})

describe('chart helpers', () => {
  it('formats compact rupiah for axis labels', async () => {
    const { formatRupiahCompact } = await import('../../shared/utils/billing')
    expect(formatRupiahCompact(1250000)).toBe('Rp 1,3 jt')
    expect(formatRupiahCompact(49000)).toBe('Rp 49 rb')
    expect(formatRupiahCompact(0)).toBe('Rp 0')
  })

  it('rounds the axis maximum up to 1, 2 or 5 × 10^k', async () => {
    const { niceMax } = await import('../../shared/utils/billing')
    expect(niceMax(0)).toBe(1)
    expect(niceMax(3)).toBe(5)
    expect(niceMax(7)).toBe(10)
    expect(niceMax(130000)).toBe(200000)
    expect(niceMax(500000)).toBe(500000)
  })
})
