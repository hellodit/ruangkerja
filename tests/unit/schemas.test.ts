import { describe, expect, it } from 'vitest'
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from '#shared/schemas/auth'
import { confirmSchema, extensionFor, presignSchema, UPLOAD_RULES } from '#shared/schemas/upload'
import { actionPlanSchema, evidenceSchema, profileSchema, progressSchema, rhkBulkSchema, rhkSchema, skpSchema } from '#shared/schemas/workspace'

const uuid = '3b241101-e2bb-4255-8caf-4136c566a962'

describe('auth schemas', () => {
  it('validates sign in', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'secret123' }).success).toBe(true)
    expect(signInSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })

  it('rejects sign up with mismatched confirmation and trims name', () => {
    const r = signUpSchema.safeParse({ name: 'Budi', email: 'a@b.co', password: 'secret123', confirmPassword: 'secret124' })
    expect(r.error?.issues[0]?.path).toEqual(['confirmPassword'])
    expect(signUpSchema.parse({ name: '  Budi  ', email: 'A@B.co', password: 'secret123', confirmPassword: 'secret123' })).toMatchObject({ name: 'Budi', email: 'a@b.co' })
  })

  it('validates forgot/reset/change password', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ password: 'secret123', confirmPassword: 'other1234' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: 'secret123', newPassword: 'secret123', confirmPassword: 'secret123' }).success).toBe(false)
  })
})

describe('upload schemas', () => {
  it('accepts avatar within limits only', () => {
    expect(presignSchema.safeParse({ kind: 'avatar', contentType: 'image/png', size: 1000 }).success).toBe(true)
    expect(presignSchema.safeParse({ kind: 'avatar', contentType: 'image/png', size: UPLOAD_RULES.avatar.maxSize + 1 }).success).toBe(false)
    expect(presignSchema.safeParse({ kind: 'avatar', contentType: 'application/pdf', size: 10 }).success).toBe(false)
    expect(presignSchema.safeParse({ kind: 'document', contentType: 'application/pdf', size: 10 }).success).toBe(false)
    expect(confirmSchema.safeParse({ uploadId: 'abc' }).success).toBe(false)
    expect(extensionFor('image/jpeg')).toBe('jpg')
  })
})

describe('workspace schemas', () => {
  const profile = { name: 'Rina', positionTitle: 'Perencana Ahli Pertama', workUnit: 'Bidang Ekonomi', agency: 'Bappeda' }

  it('requires position, unit and agency; validates NIP and phone', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true)
    expect(profileSchema.safeParse({ ...profile, agency: '' }).success).toBe(false)
    expect(profileSchema.safeParse({ ...profile, nip: '123' }).success).toBe(false)
    expect(profileSchema.parse({ ...profile, nip: '', phoneWhatsapp: '' })).toMatchObject({ nip: undefined, phoneWhatsapp: undefined })
    expect(profileSchema.safeParse({ ...profile, nip: '199005142019032004', phoneWhatsapp: '0812 0000 1234' }).success).toBe(true)
  })

  it('validates SKP deadline day range', () => {
    expect(skpSchema.safeParse({ year: 2026, evaluationFrequency: 'monthly', submissionDeadlineDay: 5 }).success).toBe(true)
    expect(skpSchema.safeParse({ year: 2026, evaluationFrequency: 'monthly', submissionDeadlineDay: 31 }).success).toBe(false)
  })

  it('requires at least one indicator with positive target', () => {
    const base = { statement: 'Tersusunnya kajian kebijakan', type: 'utama' as const }
    expect(rhkSchema.safeParse({ ...base, indicators: [] }).success).toBe(false)
    expect(rhkSchema.safeParse({ ...base, indicators: [{ aspect: 'kuantitas', indicator: 'Jumlah dokumen', target: 0, unit: 'dokumen' }] }).success).toBe(false)
    expect(rhkSchema.safeParse({ ...base, indicators: [{ aspect: 'kuantitas', indicator: 'Jumlah dokumen', target: 2, unit: 'dokumen' }] }).success).toBe(true)
  })

  it('parses pasted RHK lines, stripping numbering', () => {
    const r = rhkBulkSchema.parse({ text: '1. Tersusunnya kajian kebijakan\n\n- Terlaksananya forum konsultasi\nab' })
    expect(r.statements).toEqual(['Tersusunnya kajian kebijakan', 'Terlaksananya forum konsultasi'])
    expect(rhkBulkSchema.safeParse({ text: '\n\n' }).success).toBe(false)
  })

  it('validates action plans', () => {
    expect(actionPlanSchema.safeParse({ rhkId: uuid, periodId: uuid, name: 'Rekap data', target: 6, unit: 'OPD', dueDate: '2026-11-12' }).success).toBe(true)
    expect(actionPlanSchema.safeParse({ rhkId: uuid, periodId: uuid, name: 'Rekap data', target: 6, unit: 'OPD', dueDate: '12/11/2026' }).success).toBe(false)
  })

  it('validates progress times, links and results', () => {
    const p = { actionPlanId: uuid, workDate: '2026-11-06', startTime: '13:30', endTime: '15:30', description: 'Merevisi telaahan', realization: 1 }
    expect(progressSchema.safeParse(p).success).toBe(true)
    expect(progressSchema.safeParse({ ...p, endTime: '13:00' }).error?.issues[0]?.path).toEqual(['endTime'])
    expect(progressSchema.safeParse({ ...p, realization: -1 }).success).toBe(false)
    expect(progressSchema.safeParse({ ...p, results: [{ name: 'Telaahan', evidenceUrl: 'javascript:alert(1)' }] }).success).toBe(false)
    expect(progressSchema.parse({ ...p, results: [{ name: 'Telaahan', evidenceUrl: '' }] }).results[0]!.evidenceUrl).toBeUndefined()
    expect(progressSchema.safeParse({ ...p, description: 'x'.repeat(501) }).success).toBe(false)
  })

  it('requires a link for evidence', () => {
    expect(evidenceSchema.safeParse({ progressId: uuid, name: 'Notula', evidenceUrl: 'https://drive.google.com/x' }).success).toBe(true)
    expect(evidenceSchema.safeParse({ progressId: uuid, name: 'Notula', evidenceUrl: 'drive.google.com/x' }).success).toBe(false)
  })
})

describe('adminUsersQuery', () => {
  it('applies defaults and rejects unknown filters and page sizes', async () => {
    const { adminUsersQuery } = await import('../../shared/schemas/admin')
    expect(adminUsersQuery.parse({})).toEqual({ q: undefined, filter: 'all', page: 1, pageSize: 25 })
    expect(adminUsersQuery.parse({ q: '  rina ', page: '2', pageSize: '50', filter: 'admin' })).toEqual({ q: 'rina', filter: 'admin', page: 2, pageSize: 50 })
    expect(adminUsersQuery.safeParse({ filter: 'semua' }).success).toBe(false)
    expect(adminUsersQuery.safeParse({ pageSize: '1000' }).success).toBe(false)
    expect(adminUsersQuery.safeParse({ page: '0' }).success).toBe(false)
  })

  it('escapes LIKE wildcards in the search pattern', async () => {
    const { likePattern } = await import('../../shared/schemas/admin')
    expect(likePattern('rina')).toBe('%rina%')
    expect(likePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%')
  })
})
