import { z } from 'zod'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
export const NAME_MIN = 2
export const NAME_MAX = 80

export const emailField = () => z.string().trim().toLowerCase().pipe(z.email('Alamat email tidak valid'))

export const passwordField = () => z.string()
  .min(PASSWORD_MIN, `Kata sandi minimal ${PASSWORD_MIN} karakter`)
  .max(PASSWORD_MAX, `Kata sandi maksimal ${PASSWORD_MAX} karakter`)

export const nameField = () => z.string().trim()
  .min(NAME_MIN, `Nama minimal ${NAME_MIN} karakter`)
  .max(NAME_MAX, `Nama maksimal ${NAME_MAX} karakter`)

const passwordsMatch = { message: 'Kata sandi tidak sama. Ketik ulang dengan teliti.', path: ['confirmPassword'] }

export const signInSchema = z.object({
  email: emailField(),
  password: passwordField(),
  remember: z.boolean().optional()
})

export const magicLinkSchema = z.object({
  email: emailField()
})

export const signUpSchema = z.object({
  name: nameField(),
  email: emailField(),
  password: passwordField(),
  agree: z.boolean().refine(v => v, 'Setujui kebijakan privasi untuk melanjutkan')
})

export const forgotPasswordSchema = z.object({
  email: emailField()
})

export const resetPasswordSchema = z.object({
  password: passwordField(),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, passwordsMatch)

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Wajib diisi'),
  newPassword: passwordField(),
  confirmPassword: z.string(),
  revokeOtherSessions: z.boolean().optional()
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Konfirmasi kata sandi tidak cocok', path: ['confirmPassword'] })
  .refine(d => d.newPassword !== d.currentPassword, { message: 'Kata sandi baru harus berbeda dari kata sandi saat ini', path: ['newPassword'] })

export type SignInInput = z.output<typeof signInSchema>
export type MagicLinkInput = z.output<typeof magicLinkSchema>
export type SignUpInput = z.output<typeof signUpSchema>
export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>
export type ChangePasswordInput = z.output<typeof changePasswordSchema>
