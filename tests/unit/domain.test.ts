import { describe, expect, it } from 'vitest'
import { generatePeriods, findCurrentPeriod } from '../../shared/utils/periods'
import { addDays, daysBetween, formatDateLong, formatDateShort, formatDuration, formatTime, minutesBetween, todayInTimeZone, weekRange } from '../../shared/utils/dates'
import { formatEkinerjaCopy } from '../../shared/utils/ekinerja'
import { composeRealizationDraft } from '../../shared/utils/realization'
import { formatNumber, isOverdue, planStatusLabel } from '../../shared/utils/plans'

describe('generatePeriods', () => {
  it('creates 12 monthly periods with deadline in the next month', () => {
    const p = generatePeriods(2026, 'monthly', 5)
    expect(p).toHaveLength(12)
    expect(p[10]).toEqual({ sequence: 11, label: 'Bulanan 11', startDate: '2026-11-01', endDate: '2026-11-30', submissionDeadline: '2026-12-05' })
    expect(p[1]!.endDate).toBe('2026-02-28')
    expect(p[11]!.submissionDeadline).toBe('2027-01-05')
  })

  it('handles leap years', () => {
    expect(generatePeriods(2028, 'monthly', 5)[1]!.endDate).toBe('2028-02-29')
  })

  it('creates 4 quarterly periods', () => {
    const p = generatePeriods(2026, 'quarterly', 10)
    expect(p).toHaveLength(4)
    expect(p[3]).toEqual({ sequence: 4, label: 'Triwulan 4', startDate: '2026-10-01', endDate: '2026-12-31', submissionDeadline: '2027-01-10' })
  })

  it('finds the current period', () => {
    const p = generatePeriods(2026, 'monthly', 5)
    expect(findCurrentPeriod(p, '2026-11-06')?.sequence).toBe(11)
    expect(findCurrentPeriod(p, '2025-12-31')).toBeUndefined()
  })
})

describe('dates', () => {
  it('formats Indonesian dates', () => {
    expect(formatDateLong('2026-11-06')).toBe('Jumat, 6 November 2026')
    expect(formatDateShort('2026-11-06')).toBe('Jum, 6 Nov')
  })

  it('formats times and durations', () => {
    expect(formatTime('13:30:00')).toBe('13.30')
    expect(minutesBetween('08:30', '10:00')).toBe(90)
    expect(formatDuration(270)).toBe('4 j 30 m')
    expect(formatDuration(240)).toBe('4 j')
    expect(formatDuration(45)).toBe('45 m')
  })

  it('computes day math', () => {
    expect(daysBetween('2026-11-06', '2026-12-05')).toBe(29)
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(weekRange('2026-11-06')).toEqual({ start: '2026-11-02', end: '2026-11-06' })
    expect(weekRange('2026-11-08')).toEqual({ start: '2026-11-02', end: '2026-11-06' })
  })

  it('computes today in a timezone', () => {
    const instant = new Date('2026-11-06T18:00:00Z')
    expect(todayInTimeZone('Asia/Jakarta', instant)).toBe('2026-11-07')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-11-06')
  })
})

describe('plans', () => {
  it('flags overdue only when not done', () => {
    expect(isOverdue({ dueDate: '2026-11-05', status: 'berjalan' }, '2026-11-06')).toBe(true)
    expect(isOverdue({ dueDate: '2026-11-05', status: 'selesai' }, '2026-11-06')).toBe(false)
    expect(isOverdue({ dueDate: '2026-11-06', status: 'berjalan' }, '2026-11-06')).toBe(false)
  })

  it('labels statuses and numbers', () => {
    expect(planStatusLabel('belum_dimulai')).toBe('Belum dimulai')
    expect(formatNumber(2.5)).toBe('2,5')
    expect(formatNumber(4)).toBe('4')
  })
})

describe('formatEkinerjaCopy', () => {
  it('follows e-Kinerja field order', () => {
    const text = formatEkinerjaCopy([{
      actionPlan: 'Revisi telaahan',
      workDate: '2026-11-06',
      startTime: '13:30:00',
      endTime: '15:30:00',
      description: 'Merevisi analisis.',
      realization: 1,
      unit: 'dokumen',
      evidenceUrls: ['https://a.example/1', 'https://a.example/2']
    }])
    expect(text).toBe([
      'Rencana aksi: Revisi telaahan',
      'Tanggal: Jumat, 6 November 2026',
      'Jam: 13.30–15.30',
      'Uraian: Merevisi analisis.',
      'Realisasi: 1 dokumen',
      'Tautan bukti: https://a.example/1, https://a.example/2'
    ].join('\n'))
  })

  it('separates entries and marks missing evidence', () => {
    const e = { actionPlan: 'A', workDate: '2026-11-06', startTime: '08:00', endTime: '09:00', description: 'x', realization: 0, unit: 'kali', evidenceUrls: [] }
    const text = formatEkinerjaCopy([e, e])
    expect(text.split('\n\n')).toHaveLength(2)
    expect(text).toContain('Tautan bukti: -')
  })
})

describe('composeRealizationDraft', () => {
  const plans = [
    { name: 'Menyusun kerangka kajian', target: 1, unit: 'dokumen', realization: 1, status: 'selesai' as const, completedAt: '2026-11-04', progressCount: 2, activities: ['Menyusun kerangka.', 'Finalisasi kerangka.'] },
    { name: 'Rekap data OPD', target: 6, unit: 'OPD', realization: 4, status: 'berjalan' as const, completedAt: null, progressCount: 1, activities: ['Mengolah data dua OPD'] },
    { name: 'Draf rekomendasi', target: 1, unit: 'draf', realization: 0, status: 'belum_dimulai' as const, completedAt: null, progressCount: 0, activities: [] }
  ]

  it('uses only plans with progress and keeps their facts', () => {
    const { text, excluded } = composeRealizationDraft(plans)
    expect(text).toContain('Menyusun kerangka kajian: realisasi 1 dari 1 dokumen, selesai 4 November 2026.')
    expect(text).toContain('Rekap data OPD: realisasi 4 dari 6 OPD, masih berjalan.')
    expect(text).toContain('Kegiatan: Menyusun kerangka; Finalisasi kerangka.')
    expect(text).not.toContain('Draf rekomendasi')
    expect(excluded).toEqual(['Draf rekomendasi'])
  })

  it('returns empty text when nothing was recorded', () => {
    expect(composeRealizationDraft([plans[2]!]).text).toBe('')
  })
})
