// Load the session once per request (SSR) so the header and guards render the
// right state; the client reuses it from the payload.
export default defineNuxtPlugin(async () => {
  await useAuthSession().ensure()
})
