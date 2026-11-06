import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { schema, useDb } from './db'
import { sendResetPasswordEmail, sendVerificationEmail } from './email'

function createAuth() {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl

  if (!config.betterAuthSecret) {
    throw new Error('NUXT_BETTER_AUTH_SECRET is not set')
  }

  return betterAuth({
    appName: 'Ruang Kerja',
    baseURL: siteUrl,
    basePath: '/api/auth',
    secret: config.betterAuthSecret,
    trustedOrigins: [siteUrl],
    database: drizzleAdapter(useDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit
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
      accountLinking: {
        enabled: true,
        // Never auto-link Google to a local account whose email is unverified:
        // an attacker could pre-register the victim's email with a password.
        requireLocalEmailVerified: true
      }
    },
    user: {
      // Email change is out of scope (needs its own verification flow).
      changeEmail: { enabled: false }
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
        '/change-password': { window: 60, max: 5 }
      }
    },
    advanced: {
      useSecureCookies: siteUrl.startsWith('https://'),
      database: {
        generateId: () => crypto.randomUUID()
      }
    },
    plugins: [
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: config.turnstile.secretKey,
        endpoints: ['/sign-in/email', '/sign-up/email', '/request-password-reset']
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
