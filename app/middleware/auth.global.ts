const GUEST_ONLY = ['/login', '/register', '/forgot-password']
const PUBLIC = [...GUEST_ONLY, '/reset-password', '/verify-email', '/privasi']

/**
 * - Public auth pages are open; signed-in users skip login/register.
 * - Everything else needs a session.
 * - Until onboarding is finished, the workspace redirects to it (ONB).
 * - /admin is for admins only.
 * - Without an active package, everything except /subscription and /profil
 *   redirects to /subscription (admins are exempt).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { ensure } = useAuthSession()
  const session = await ensure()

  if (PUBLIC.includes(to.path)) {
    if (session && GUEST_ONLY.includes(to.path)) {
      return navigateTo('/beranda')
    }
    return
  }

  if (!session) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined })
  }

  const me = await useMe().ensure()
  // Admin panel: admins only (the API checks again); not gated by onboarding.
  if (to.path.startsWith('/admin')) {
    return me?.isAdmin ? undefined : navigateTo('/beranda')
  }
  // No active package: pay first. /profil stays open (account, export, delete).
  const needsPackage = !!me && !me.isAdmin && !me.subscription
  if (needsPackage && to.path !== '/subscription' && to.path !== '/profil') {
    return navigateTo('/subscription')
  }
  if (to.path === '/subscription') {
    return
  }
  const inOnboarding = to.path.startsWith('/onboarding')
  if (me && !me.onboardingCompleted && !inOnboarding && to.path !== '/profil') {
    return navigateTo('/onboarding/profil')
  }
  if (to.path === '/') {
    return navigateTo(me && !me.onboardingCompleted ? '/onboarding/profil' : '/beranda')
  }
})
