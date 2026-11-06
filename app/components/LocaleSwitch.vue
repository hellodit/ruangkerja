<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const items = computed(() => locales.value.map(l => ({
  label: l.name ?? l.code,
  to: switchLocalePath(l.code),
  checked: l.code === locale.value,
  type: 'checkbox' as const
})))
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      icon="i-lucide-languages"
      color="neutral"
      variant="ghost"
      :aria-label="t('nav.language')"
    />
  </UDropdownMenu>
</template>
