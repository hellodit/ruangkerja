import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'

/**
 * Admin panel guard. The role is re-read from the database on every request
 * (not trusted from a cached session), so revoking it takes effect at once.
 * Non-admins get 404 so the panel's existence is not advertised.
 */
export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  const [row] = await useDb().select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, user.id))
  if (row?.role !== 'admin') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  return user
}
