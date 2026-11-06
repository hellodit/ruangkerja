<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: locale
  }
})

useSeoMeta({
  titleTemplate: title => (title ? `${title} · Ruang Kerja` : 'Ruang Kerja'),
  description: () => t('home.description')
})
</script>

<template>
  <UApp>
    <UHeader :to="localePath('/')">
      <template #title>
        <span class="font-semibold text-highlighted">{{ t('app.name') }}</span>
      </template>

      <template #right>
        <LocaleSwitch />
        <UColorModeButton />
        <UserMenu />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          © {{ new Date().getFullYear() }} {{ t('app.name') }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
