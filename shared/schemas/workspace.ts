import { z } from 'zod'
import { nameField } from './auth'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid')
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format jam tidak valid (JJ:MM)')
const optionalText = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter`).optional().transform(v => (v ? v : undefined))
const requiredText = (label: string, min: number, max: number) => z.string().trim()
  .min(min, min <= 1 ? `${label} wajib diisi` : `${label} minimal ${min} karakter`)
  .max(max, `${label} maksimal ${max} karakter`)

/** Only http(s) links — evidence must be openable by the supervisor. */
export const evidenceUrlField = z.string().trim().max(2048, 'Tautan terlalu panjang')
  .refine((v) => {
    try {
      const u = new URL(v)
      return u.protocol === 'https:' || u.protocol === 'http:'
    } catch {
      return false
    }
  }, 'Tautan harus diawali https:// atau http://')

const optionalUrl = z.union([z.literal(''), evidenceUrlField]).optional().transform(v => (v ? v : undefined))

// ---------------------------------------------------------------------------
// Profile (onboarding step 1 and Profil page)
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  name: nameField(),
  phoneWhatsapp: z.string().trim().regex(/^(\+?62|0)[0-9 -]{8,15}$/, 'Nomor WhatsApp tidak valid').optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  birthDate: z.union([z.literal(''), isoDate]).optional().transform(v => (v ? v : undefined)),
  gender: z.enum(['perempuan', 'laki_laki']).optional(),
  address: optionalText(500),
  nip: z.string().trim().regex(/^\d{18}$/, 'NIP terdiri dari 18 angka').optional().or(z.literal('')).transform(v => (v ? v : undefined)),
  employmentStatus: z.enum(['pns', 'pppk']).optional(),
  rankGrade: optionalText(120),
  positionTitle: requiredText('Jabatan', 2, 160),
  workUnit: requiredText('Unit kerja', 2, 160),
  agency: requiredText('Instansi', 2, 160),
  supervisorName: optionalText(120),
  supervisorTitle: optionalText(160)
})
export type ProfileInput = z.input<typeof profileSchema>

export const settingsSchema = z.object({
  remindBeforeDeadline: z.boolean(),
  remindDaysBefore: z.number().int().min(1).max(14),
  remindDaily: z.boolean(),
  remindDailyTime: hhmm,
  progressView: z.enum(['list', 'calendar'])
}).partial()
export type SettingsInput = z.infer<typeof settingsSchema>

// ---------------------------------------------------------------------------
// SKP and RHK
// ---------------------------------------------------------------------------

export const skpSchema = z.object({
  year: z.number().int().min(2024).max(2100),
  evaluationFrequency: z.enum(['monthly', 'quarterly']),
  submissionDeadlineDay: z.number().int().min(1, 'Tanggal 1–28').max(28, 'Tanggal 1–28')
})
export type SkpInput = z.infer<typeof skpSchema>

export const indicatorSchema = z.object({
  aspect: z.enum(['kuantitas', 'kualitas', 'waktu', 'biaya']),
  indicator: requiredText('Indikator', 3, 500),
  target: z.number({ error: 'Target wajib berupa angka' }).positive('Target harus lebih dari 0').max(1_000_000),
  unit: requiredText('Satuan', 1, 40)
})
export type IndicatorInput = z.infer<typeof indicatorSchema>

export const rhkSchema = z.object({
  supervisorRhk: optionalText(1000),
  statement: requiredText('Rumusan RHK', 5, 1000),
  type: z.enum(['utama', 'tambahan']),
  indicators: z.array(indicatorSchema).min(1, 'Tambahkan minimal satu indikator').max(10, 'Maksimal 10 indikator')
})
export type RhkInput = z.input<typeof rhkSchema>

/** Paste several RHK statements at once (one per line), completed later. */
export const rhkBulkSchema = z.object({
  type: z.enum(['utama', 'tambahan']).default('utama'),
  text: z.string().max(20_000)
}).transform(d => ({
  type: d.type,
  statements: d.text.split(/\r?\n/)
    .map(l => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim())
    .filter(l => l.length >= 5)
})).refine(d => d.statements.length >= 1 && d.statements.length <= 30, { message: 'Tempel 1–30 RHK, satu per baris', path: ['text'] })

// ---------------------------------------------------------------------------
// Action plans
// ---------------------------------------------------------------------------

export const actionPlanSchema = z.object({
  rhkId: z.uuid(),
  periodId: z.uuid(),
  name: requiredText('Nama rencana aksi', 3, 300),
  target: z.number({ error: 'Target wajib berupa angka' }).positive('Target harus lebih dari 0').max(1_000_000),
  unit: requiredText('Satuan', 1, 40),
  dueDate: isoDate
})
export type ActionPlanInput = z.infer<typeof actionPlanSchema>

export const actionPlanUpdateSchema = actionPlanSchema.omit({ rhkId: true, periodId: true }).partial().extend({
  status: z.enum(['belum_dimulai', 'berjalan', 'selesai']).optional()
})

export const copyActionPlansSchema = z.object({
  fromPeriodId: z.uuid(),
  toPeriodId: z.uuid()
})

// ---------------------------------------------------------------------------
// Daily progress
// ---------------------------------------------------------------------------

export const PROGRESS_DESCRIPTION_MAX = 500

export const progressResultSchema = z.object({
  name: requiredText('Nama hasil', 1, 1000),
  evidenceUrl: optionalUrl
})

export const progressSchema = z.object({
  actionPlanId: z.uuid('Pilih rencana aksi'),
  workDate: isoDate,
  startTime: hhmm,
  endTime: hhmm,
  description: requiredText('Uraian', 3, PROGRESS_DESCRIPTION_MAX),
  descriptionRaw: optionalText(2000),
  inputMethod: z.enum(['typed', 'voice']).default('typed'),
  realization: z.number({ error: 'Realisasi wajib berupa angka' }).min(0, 'Realisasi tidak boleh negatif').max(1_000_000),
  category: z.enum(['biasa', 'perlu_diskusi']).default('biasa'),
  marksPlanComplete: z.boolean().default(false),
  results: z.array(progressResultSchema).max(10, 'Maksimal 10 hasil').default([])
}).refine(d => d.endTime.slice(0, 5) > d.startTime.slice(0, 5), { message: 'Jam selesai harus setelah jam mulai', path: ['endTime'] })
export type ProgressInput = z.input<typeof progressSchema>

export const evidenceSchema = z.object({
  progressId: z.uuid(),
  name: requiredText('Nama dokumen', 1, 1000),
  evidenceUrl: evidenceUrlField
})
export type EvidenceInput = z.infer<typeof evidenceSchema>

export const evidenceUpdateSchema = z.object({
  name: requiredText('Nama dokumen', 1, 1000),
  evidenceUrl: optionalUrl
})

export const markCopiedSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200)
})

// ---------------------------------------------------------------------------
// Realization
// ---------------------------------------------------------------------------

export const realizationUpdateSchema = z.object({
  finalText: z.string().trim().max(10_000, 'Maksimal 10.000 karakter').nullable()
})
