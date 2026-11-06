import { createAuthClient } from 'better-auth/vue'

export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: string | Date
}

interface SessionPayload {
  user: AuthUser
  session: { id: string, expiresAt: string | Date }
}

let _client: ReturnType<typeof createAuthClient> | undefined

/** Better Auth client. Use for user-initiated actions (browser side). */
export function useAuthClient() {
  if (!_client) {
    _client = createAuthClient({
      baseURL: import.meta.client ? window.location.origin : useRuntimeConfig().public.siteUrl,
      basePath: '/api/auth'
    })
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

/** Translate a Better Auth client error into a user-facing message. */
export function useAuthErrorMessage() {
  const { t, te } = useI18n()
  return (error: { code?: string, status?: number, message?: string } | null | undefined) => {
    if (!error) {
      return t('common.error')
    }
    if (error.status === 429) {
      return t('auth.errors.RATE_LIMITED')
    }
    const key = `auth.errors.${error.code}`
    return error.code && te(key) ? t(key) : t('common.error')
  }
}
