export default defineEventHandler((event) => {
  const request = toWebRequest(event)
  // Always overwrite: a client-supplied value must never reach Better Auth.
  request.headers.delete(CLIENT_IP_HEADER)
  const ip = resolveClientIp(event)
  if (ip) {
    request.headers.set(CLIENT_IP_HEADER, ip)
  }
  return useAuth().handler(request)
})
