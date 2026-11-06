import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha, magicLink } from 'better-auth/plugins'
import { authBeforeHook } from './auth-hooks'
import { CLIENT_IP_HEADER } from './client-ip'
import { schema, useDb } from './db'
import { sendMagicLinkEmail, sendResetPasswordEmail, sendVerificationEmail } from './email'

function createAuth() {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl

  if (!config.betterAuthSecret) {
    throw new Error('NUXT_BETTER_AUTH_SECRET is not set')
  }

  return betterAuth({
    appName: 'RuangKerja',
    baseURL: siteUrl,
    basePath: '/api/auth',
    secret: config.betterAuthSecret,
    trustedOrigins: [siteUrl],
    database: drizzleAdapter(useDb(), {
      provider: 'pg',
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
        rate_limits: schema.rateLimits
      }
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Spec decision: verification is optional — it never blocks sign-in.
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        // Never let a delivery failure change the response: that would reveal
        // which emails are registered. Failures are logged for operators.
        await sendResetPasswordEmail(user.email, user.name, url).catch((err: unknown) => {
          console.error('[auth] reset password email failed', err)
        })
      }
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(user.email, user.name, url)
      }
    },
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        prompt: 'select_account'
      }
    },
    account: {
      modelName: 'accounts',
      accountLinking: {
        enabled: true,
        // Never auto-link Google to a local account whose email is unverified:
        // an attacker could pre-register the victim's email with a password.
        requireLocalEmailVerified: true
      }
    },
    // Plural table names (PRD): avoids PostgreSQL's reserved word "user".
    user: {
      modelName: 'users',
      additionalFields: {
        timezone: { type: 'string', required: false, defaultValue: 'Asia/Jakarta', input: false },
        onboardingCompletedAt: { type: 'date', required: false, input: false }
      },
      // Email change is out of scope (needs its own verification flow).
      changeEmail: { enabled: false },
      // PRD: users can delete their account; this removes ALL their data
      // (FK cascade), not a soft delete.
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await deleteUserAvatar(user.id, user.image ?? null)
        }
      }
    },
    session: { modelName: 'sessions' },
    verification: { modelName: 'verifications' },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rate_limits',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/sign-in/magic-link': { window: 60, max: 3 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
        '/change-password': { window: 60, max: 5 }
      }
    },
    hooks: {
      before: authBeforeHook
    },
    advanced: {
      ipAddress: {
        // Set by server/api/auth/[...all].ts from the socket / trusted proxy.
        ipAddressHeaders: [CLIENT_IP_HEADER]
      },
      useSecureCookies: siteUrl.startsWith('https://'),
      database: {
        generateId: 'uuid'
      }
    },
    plugins: [
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: config.turnstile.secretKey,
        endpoints: ['/sign-in/email', '/sign-up/email', '/request-password-reset', '/sign-in/magic-link']
      }),
      magicLink({
        expiresIn: 15 * 60,
        // Magic links sign in existing accounts only; registration goes through the form.
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) => {
          // Same response whether or not the email exists (no enumeration).
          await sendMagicLinkEmail(email, url).catch((err: unknown) => {
            console.error('[auth] magic link email failed', err)
          })
        }
      })
    ]
  })
}

let _auth: ReturnType<typeof createAuth> | undefined

export function useAuth() {
  if (!_auth) {
    _auth = createAuth()
  }
  return _auth
}

export type Auth = ReturnType<typeof createAuth>
