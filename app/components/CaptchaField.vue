<script setup lang="ts">
const token = defineModel<string>({ default: '' })
const widget = useTemplateRef<{ reset: () => void }>('widget')

defineExpose({
  reset: () => {
    token.value = ''
    widget.value?.reset()
  }
})
</script>

<template>
  <div class="flex min-h-[65px] justify-center">
    <NuxtTurnstile
      ref="widget"
      v-model="token"
      :options="{ language: 'id', theme: 'auto', size: 'flexible' }"
    />
  </div>
</template>
