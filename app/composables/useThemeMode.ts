/**
 * Light/dark switch. Light is the default (nuxt.config colorMode.preference);
 * an explicit choice is stored by @nuxtjs/color-mode in localStorage.
 */
export function useThemeMode() {
  const colorMode = useColorMode()
  const isDark = computed({
    get: () => colorMode.value === 'dark',
    set: (dark: boolean) => {
      colorMode.preference = dark ? 'dark' : 'light'
    }
  })
  return { isDark }
}
