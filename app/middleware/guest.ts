export default defineNuxtRouteMiddleware(async () => {
  const { ensure } = useAuthSession()
  if (await ensure()) {
    return navigateTo(useLocalePath()('/profile'))
  }
})
