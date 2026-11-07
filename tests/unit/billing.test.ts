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
    const p = computePackagePeriod({ now, currentEnd: null, durationDays: 30, start: 'extend' })
    expect(p.start).toEqual(now)
    expect(p.end.getTime() - now.getTime()).toBe(30 * DAY)
  })

  it('extends after the current period so no paid days are lost', () => {
    const currentEnd = new Date('2026-11-20T00:00:00Z')
    const p = computePackagePeriod({ now, currentEnd, durationDays: 30, start: 'extend' })
    expect(p.start).toEqual(currentEnd)
    expect(p.end).toEqual(new Date(currentEnd.getTime() + 30 * DAY))
  })

  it('ignores an expired period and can be forced to start now', () => {
    expect(computePackagePeriod({ now, currentEnd: new Date('2026-10-01T00:00:00Z'), durationDays: 7, start: 'extend' }).start).toEqual(now)
    expect(computePackagePeriod({ now, currentEnd: new Date('2026-11-20T00:00:00Z'), durationDays: 7, start: 'now' }).start).toEqual(now)
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
    expect(ok).toMatchObject({ amount: 0, start: 'extend', reference: null, notes: 'Promo' })
    expect(assignPackageSchema.safeParse({ userId: 'x', packageId: '7b475d92-b0a5-40b8-92c0-c681d28a97a2', amount: 0 }).success).toBe(false)
  })
})
