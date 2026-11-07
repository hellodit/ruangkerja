<script setup lang="ts">
/** 56px status tile above an auth message (brand by default, warning for expired links). */
withDefaults(defineProps<{ icon: string, tone?: 'brand' | 'warning' | 'success' | 'error' }>(), { tone: 'brand' })
const tones = {
  brand: 'bg-brand-50 text-brand-ink dark:bg-brand-950/60',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error'
}
</script>

<template>
  <span
    class="flex size-14 items-center justify-center rounded-2xl"
    :class="tones[tone]"
  >
    <UIcon
      :name="icon"
      class="size-7"
    />
  </span>
</template>
