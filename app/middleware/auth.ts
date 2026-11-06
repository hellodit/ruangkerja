export default defineNuxtRouteMiddleware(async (to) => {
  const { ensure } = useAuthSession()
  const session = await ensure()
  if (!session) {
    const localePath = useLocalePath()
    return navigateTo({ path: localePath('/login'), query: { redirect: to.fullPath } })
  }
})
