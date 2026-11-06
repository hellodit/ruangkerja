import { z } from 'zod'
import { identity, type Translate } from './i18n'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
export const NAME_MIN = 2
export const NAME_MAX = 80

export const emailField = (t: Translate = identity) =>
  z.string().trim().toLowerCase().pipe(z.email(t('validation.email')))

export const passwordField = (t: Translate = identity) =>
  z.string()
    .min(PASSWORD_MIN, t('validation.passwordMin', { min: PASSWORD_MIN }))
    .max(PASSWORD_MAX, t('validation.passwordMax', { max: PASSWORD_MAX }))

export const nameField = (t: Translate = identity) =>
  z.string().trim()
    .min(NAME_MIN, t('validation.nameMin', { min: NAME_MIN }))
    .max(NAME_MAX, t('validation.nameMax', { max: NAME_MAX }))

export const makeSignInSchema = (t: Translate = identity) => z.object({
  email: emailField(t),
  password: passwordField(t),
  remember: z.boolean().optional()
})

export const makeSignUpSchema = (t: Translate = identity) => z.object({
  name: nameField(t),
  email: emailField(t),
  password: passwordField(t),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, {
  message: t('validation.passwordMismatch'),
  path: ['confirmPassword']
})

export const makeForgotPasswordSchema = (t: Translate = identity) => z.object({
  email: emailField(t)
})

export const makeResetPasswordSchema = (t: Translate = identity) => z.object({
  password: passwordField(t),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, {
  message: t('validation.passwordMismatch'),
  path: ['confirmPassword']
})

export const signInSchema = makeSignInSchema()
export const signUpSchema = makeSignUpSchema()
export const forgotPasswordSchema = makeForgotPasswordSchema()
export const resetPasswordSchema = makeResetPasswordSchema()

export type SignInInput = z.output<typeof signInSchema>
export type SignUpInput = z.output<typeof signUpSchema>
export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>
