import type { H3Event } from 'h3'

export async function getAuthSession(event: H3Event) {
  return useAuth().api.getSession({ headers: event.headers })
}

/** Returns the signed-in user or throws 401. */
export async function requireUser(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session.user
}
