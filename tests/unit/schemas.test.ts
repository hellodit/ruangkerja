import { describe, expect, it } from 'vitest'
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from '#shared/schemas/auth'
import { changePasswordSchema, updateProfileSchema } from '#shared/schemas/profile'
import { confirmSchema, extensionFor, presignSchema, UPLOAD_RULES } from '#shared/schemas/upload'

describe('auth schemas', () => {
  it('accepts valid sign in', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'secret123' }).success).toBe(true)
  })

  it('rejects invalid email and short password', () => {
    const r = signInSchema.safeParse({ email: 'nope', password: 'x' })
    expect(r.success).toBe(false)
  })

  it('rejects sign up with mismatched confirmation', () => {
    const r = signUpSchema.safeParse({ name: 'Budi', email: 'a@b.co', password: 'secret123', confirmPassword: 'secret124' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['confirmPassword'])
  })

  it('rejects sign up with password shorter than 8 or longer than 128', () => {
    expect(signUpSchema.safeParse({ name: 'Budi', email: 'a@b.co', password: 'short', confirmPassword: 'short' }).success).toBe(false)
    const long = 'a'.repeat(129)
    expect(signUpSchema.safeParse({ name: 'Budi', email: 'a@b.co', password: long, confirmPassword: long }).success).toBe(false)
  })

  it('trims name and requires at least 2 chars', () => {
    expect(signUpSchema.safeParse({ name: '  B ', email: 'a@b.co', password: 'secret123', confirmPassword: 'secret123' }).success).toBe(false)
    const ok = signUpSchema.parse({ name: '  Budi  ', email: 'a@b.co', password: 'secret123', confirmPassword: 'secret123' })
    expect(ok.name).toBe('Budi')
  })

  it('forgot and reset password', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ password: 'secret123', confirmPassword: 'other1234' }).success).toBe(false)
  })
})

describe('profile schemas', () => {
  it('validates name update', () => {
    expect(updateProfileSchema.safeParse({ name: 'Siti' }).success).toBe(true)
    expect(updateProfileSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false)
  })

  it('requires new password to differ from current', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'secret123', newPassword: 'secret123', confirmPassword: 'secret123' })
    expect(r.success).toBe(false)
  })
})

describe('upload schemas', () => {
  it('accepts avatar within limits', () => {
    expect(presignSchema.safeParse({ kind: 'avatar', contentType: 'image/png', size: 1000, fileName: 'me.png' }).success).toBe(true)
  })

  it('rejects avatar over 2MB', () => {
    expect(presignSchema.safeParse({ kind: 'avatar', contentType: 'image/png', size: UPLOAD_RULES.avatar.maxSize + 1, fileName: 'me.png' }).success).toBe(false)
  })

  it('rejects pdf as avatar but accepts pdf as document', () => {
    expect(presignSchema.safeParse({ kind: 'avatar', contentType: 'application/pdf', size: 1000, fileName: 'a.pdf' }).success).toBe(false)
    expect(presignSchema.safeParse({ kind: 'document', contentType: 'application/pdf', size: 1000, fileName: 'a.pdf' }).success).toBe(true)
  })

  it('rejects document over 10MB and zero-size files', () => {
    expect(presignSchema.safeParse({ kind: 'document', contentType: 'application/pdf', size: 10_485_761, fileName: 'a.pdf' }).success).toBe(false)
    expect(presignSchema.safeParse({ kind: 'document', contentType: 'application/pdf', size: 0, fileName: 'a.pdf' }).success).toBe(false)
  })

  it('rejects unknown content types', () => {
    expect(presignSchema.safeParse({ kind: 'document', contentType: 'text/html', size: 10, fileName: 'a.html' }).success).toBe(false)
  })

  it('confirm requires uuid', () => {
    expect(confirmSchema.safeParse({ uploadId: 'abc' }).success).toBe(false)
    expect(confirmSchema.safeParse({ uploadId: '3b241101-e2bb-4255-8caf-4136c566a962' }).success).toBe(true)
  })

  it('maps mime to extension', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('application/pdf')).toBe('pdf')
  })
})

describe('sanitizeFileName', () => {
  it('strips path separators and control characters', async () => {
    const { sanitizeFileName } = await import('#shared/schemas/upload')
    expect(sanitizeFileName('../../etc/passwd')).toBe('.._.._etc_passwd')
    expect(sanitizeFileName('a"b\u0000c.pdf')).toBe('abc.pdf')
    expect(sanitizeFileName('   ')).toBe('file')
  })
})
