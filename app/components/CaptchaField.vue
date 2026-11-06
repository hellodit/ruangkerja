<script setup lang="ts">
const token = defineModel<string>({ default: '' })
const { locale } = useI18n()
const widget = useTemplateRef<{ reset: () => void }>('widget')

defineExpose({
  reset: () => {
    token.value = ''
    widget.value?.reset()
  }
})
</script>

<template>
  <div class="flex justify-center">
    <NuxtTurnstile
      ref="widget"
      v-model="token"
      :options="{ language: locale, theme: 'auto', size: 'flexible' }"
    />
  </div>
</template>
