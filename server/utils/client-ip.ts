import type { H3Event } from 'h3'

/** Private header carrying the resolved client IP into Better Auth. */
export const CLIENT_IP_HEADER = 'x-ruangkerja-client-ip'

/**
 * Resolve the client IP for rate limiting.
 * - NUXT_TRUST_PROXY=false (default): the socket address; X-Forwarded-For is
 *   ignored because any client can forge it.
 * - NUXT_TRUST_PROXY=true: the LAST X-Forwarded-For entry, i.e. the address
 *   seen by the single trusted proxy in front of the app (Vercel, nginx with
 *   proxy_add_x_forwarded_for). Earlier entries are client-controlled.
 */
export function resolveClientIp(event: H3Event): string | undefined {
  if (useRuntimeConfig().trustProxy) {
    const forwarded = getRequestHeader(event, 'x-forwarded-for')
    const last = forwarded?.split(',').map(s => s.trim()).filter(Boolean).pop()
    if (last) {
      return last
    }
  }
  return getRequestIP(event)
}
