import { z } from 'zod'
import { nameField, passwordField } from './auth'
import { identity, type Translate } from './i18n'

export const makeUpdateProfileSchema = (t: Translate = identity) => z.object({
  name: nameField(t)
})

export const makeChangePasswordSchema = (t: Translate = identity) => z.object({
  currentPassword: z.string().min(1, t('validation.required')),
  newPassword: passwordField(t),
  confirmPassword: z.string(),
  revokeOtherSessions: z.boolean().optional()
}).refine(d => d.newPassword === d.confirmPassword, {
  message: t('validation.passwordMismatch'),
  path: ['confirmPassword']
}).refine(d => d.newPassword !== d.currentPassword, {
  message: t('validation.passwordSame'),
  path: ['newPassword']
})

export const updateProfileSchema = makeUpdateProfileSchema()
export const changePasswordSchema = makeChangePasswordSchema()

export type UpdateProfileInput = z.output<typeof updateProfileSchema>
export type ChangePasswordInput = z.output<typeof changePasswordSchema>
