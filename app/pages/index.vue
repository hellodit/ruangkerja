<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthSession()

const links = computed(() => auth.loggedIn.value
  ? [{ label: t('home.goProfile'), to: localePath('/profile'), trailingIcon: 'i-lucide-arrow-right', size: 'xl' as const }]
  : [
      { label: t('home.getStarted'), to: localePath('/register'), trailingIcon: 'i-lucide-arrow-right', size: 'xl' as const },
      { label: t('nav.login'), to: localePath('/login'), color: 'neutral' as const, variant: 'subtle' as const, size: 'xl' as const }
    ])
</script>

<template>
  <UPageHero
    :title="t('home.title')"
    :description="t('home.description')"
    :links="links"
  />
</template>
