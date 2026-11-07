<script setup lang="ts">
/** CTM "Chip" label: semantic fill, 14/20 text, optional 8px status dot. */
type ChipColor = 'success' | 'info' | 'warning' | 'error' | 'neutral'
withDefaults(defineProps<{ color?: ChipColor, dot?: boolean }>(), { color: 'neutral', dot: true })

const DOT: Record<ChipColor, string> = {
  success: 'bg-green-600 dark:bg-green-400',
  info: 'bg-blue-600 dark:bg-blue-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  error: 'bg-red-600 dark:bg-red-400',
  neutral: 'bg-slate-500 dark:bg-slate-400'
}
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    class="whitespace-nowrap"
  >
    <span
      v-if="dot"
      class="size-2 shrink-0 rounded-full"
      :class="DOT[color]"
      aria-hidden="true"
    />
    <slot />
  </UBadge>
</template>
