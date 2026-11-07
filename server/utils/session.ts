import type { H3Event } from 'h3'

type AuthSession = Awaited<ReturnType<ReturnType<typeof useAuth>['api']['getSession']>>

/**
 * The request's Better Auth session, looked up once per request: the
 * subscription middleware and the handler both need it, and every lookup is
 * a database round trip.
 */
export function getAuthSession(event: H3Event): Promise<AuthSession> {
  const ctx = event.context as { authSession?: Promise<AuthSession> }
  ctx.authSession ??= useAuth().api.getSession({ headers: event.headers })
  return ctx.authSession
}

/** Returns the signed-in user or throws 401. */
export async function requireUser(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session.user
}
