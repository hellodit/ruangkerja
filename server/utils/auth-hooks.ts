import { APIError, createAuthMiddleware } from 'better-auth/api'
import { z } from 'zod'
import { emailField, nameField, passwordField } from '#shared/schemas/auth'

/**
 * Server-side Zod validation for the Better Auth endpoints that accept
 * user-controlled profile data. Better Auth only checks password length; the
 * app's name/email rules are enforced here. `image` may never be set by the
 * client: avatars only change through the verified R2 upload flow.
 */
const signUpBody = z.object({
  name: nameField(),
  email: emailField(),
  password: passwordField(),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional()
}).strict()

const updateUserBody = z.object({
  name: nameField()
}).strict()

function invalid(error: z.ZodError): never {
  throw new APIError('BAD_REQUEST', {
    code: 'VALIDATION_ERROR',
    message: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  })
}

export const authBeforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === '/sign-up/email') {
    const parsed = signUpBody.safeParse(ctx.body)
    if (!parsed.success) {
      invalid(parsed.error)
    }
    return { context: { body: parsed.data } }
  }
  if (ctx.path === '/update-user') {
    const parsed = updateUserBody.safeParse(ctx.body)
    if (!parsed.success) {
      invalid(parsed.error)
    }
    return { context: { body: parsed.data } }
  }
})
