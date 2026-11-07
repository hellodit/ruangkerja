/**
 * Workspace APIs need an active package (admins are exempt). The page
 * middleware sends users to /subscription; this enforces the same rule for
 * direct API calls. Account, profile, settings, export and the subscription
 * endpoints themselves stay open so a user can always pay, manage or delete
 * their account.
 */
const GATED = ['/api/onboarding', '/api/skp', '/api/rhks', '/api/action-plans', '/api/progress', '/api/evidence', '/api/dashboard', '/api/realizations']

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]!
  if (!GATED.some(p => path === p || path.startsWith(`${p}/`))) return

  const session = await getAuthSession(event)
  if (!session) return // the handler answers 401
  if ((session.user as { role?: string }).role === 'admin') return
  if (!(await hasActivePackage(session.user.id))) {
    throw createError({ statusCode: 402, statusMessage: 'Pilih dan bayar paket untuk memakai ruang kerja.' })
  }
})
