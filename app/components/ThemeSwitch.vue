<script setup lang="ts">
/**
 * Always-visible light/dark switch ("Mode gelap"), light by default.
 * `compact` renders an icon button instead, for the collapsed sidebar.
 */
withDefaults(defineProps<{ compact?: boolean, inverted?: boolean }>(), { compact: false, inverted: false })
const { isDark } = useThemeMode()
</script>

<template>
  <!-- The stored choice is only known in the browser: render after hydration so the state never flips on load. -->
  <ClientOnly>
    <UTooltip
      v-if="compact"
      :text="isDark ? 'Mode terang' : 'Mode gelap'"
      :content="{ side: 'right' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        square
        :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
        :aria-label="isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
        :class="inverted && 'text-slate-300 hover:bg-white/5 hover:text-white'"
        @click="isDark = !isDark"
      />
    </UTooltip>
    <USwitch
      v-else
      v-model="isDark"
      label="Mode gelap"
      unchecked-icon="i-lucide-sun"
      checked-icon="i-lucide-moon"
      :ui="{ label: inverted ? 'text-sm/5 font-medium text-slate-300' : 'text-sm/5 font-medium text-toned', root: 'items-center' }"
    />
    <template #fallback>
      <span
        class="inline-block h-9"
        :class="compact ? 'w-9' : 'w-32'"
        aria-hidden="true"
      />
    </template>
  </ClientOnly>
</template>
