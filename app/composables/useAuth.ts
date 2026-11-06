import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  timezone?: string
  onboardingCompletedAt?: string | null
  createdAt: string | Date
}

interface SessionPayload {
  user: AuthUser
  session: { id: string, expiresAt: string | Date }
}

function makeClient() {
  return createAuthClient({
    baseURL: import.meta.client ? window.location.origin : useRuntimeConfig().public.siteUrl,
    basePath: '/api/auth',
    plugins: [magicLinkClient()]
  })
}

let _client: ReturnType<typeof makeClient> | undefined

/** Better Auth client for user-initiated actions (browser side). */
export function useAuthClient() {
  if (!_client) {
    _client = makeClient()
  }
  return _client
}

/** SSR-safe session state shared across the app. */
export function useAuthSession() {
  const state = useState<SessionPayload | null>('auth:session', () => null)
  const loaded = useState<boolean>('auth:session-loaded', () => false)
  const requestFetch = useRequestFetch()

  async function refresh() {
    try {
      state.value = await requestFetch<SessionPayload | null>('/api/auth/get-session', {
        headers: { 'cache-control': 'no-store' }
      })
    } catch {
      state.value = null
    }
    loaded.value = true
    return state.value
  }

  async function ensure() {
    if (!loaded.value) {
      await refresh()
    }
    return state.value
  }

  async function signOut() {
    await useAuthClient().signOut()
    state.value = null
    loaded.value = true
    clearNuxtState('me')
  }

  return {
    session: state,
    user: computed(() => state.value?.user ?? null),
    loggedIn: computed(() => !!state.value?.user),
    refresh,
    ensure,
    signOut
  }
}

const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email atau kata sandi salah',
  USER_ALREADY_EXISTS: 'Email sudah terdaftar',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Email sudah terdaftar, gunakan email lain',
  INVALID_PASSWORD: 'Kata sandi salah',
  PASSWORD_TOO_SHORT: 'Kata sandi terlalu pendek',
  PASSWORD_TOO_LONG: 'Kata sandi terlalu panjang',
  INVALID_TOKEN: 'Tautan tidak valid atau sudah kedaluwarsa',
  TOKEN_EXPIRED: 'Tautan sudah kedaluwarsa',
  VERIFICATION_FAILED: 'Verifikasi keamanan gagal. Silakan coba lagi.',
  MISSING_RESPONSE: 'Selesaikan verifikasi keamanan terlebih dahulu',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Akun ini tidak memakai kata sandi',
  EMAIL_ALREADY_VERIFIED: 'Email sudah terverifikasi',
  SESSION_EXPIRED: 'Sesi sudah lama. Masuk ulang lalu coba lagi.',
  VALIDATION_ERROR: 'Periksa kembali isian Anda'
}

/** Translate a Better Auth client error into a user-facing message. */
export function authErrorMessage(error: { code?: string, status?: number, message?: string } | null | undefined): string {
  if (!error) {
    return 'Terjadi kesalahan. Silakan coba lagi.'
  }
  if (error.status === 429) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  }
  return (error.code && AUTH_ERRORS[error.code]) || 'Terjadi kesalahan. Silakan coba lagi.'
}
