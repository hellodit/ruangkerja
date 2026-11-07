<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'

/** ONB-01: three steps; actions live in the bottom bar, never in the header. */
const props = defineProps<{ step: 1 | 2 | 3 }>()
const items: StepperItem[] = [
  { title: 'Isi profil', icon: 'i-ctm-user' },
  { title: 'RHK', icon: 'i-ctm-policy' },
  { title: 'Ringkasan', icon: 'i-ctm-check' }
]
// UStepper's model value is the 0-based index of the active step.
const current = computed(() => props.step - 1)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-default bg-default px-4 py-3 sm:px-8">
      <AppLogo />
      <nav
        aria-label="Langkah persiapan"
        class="flex min-w-0 flex-1 justify-center"
      >
        <UStepper
          :model-value="current"
          :items="items"
          disabled
          size="sm"
          class="w-full max-w-md"
        />
      </nav>
      <ThemeSwitch />
    </header>

    <div class="mx-auto w-full max-w-5xl flex-1 px-4 pt-10 pb-12 sm:px-8">
      <slot />
    </div>

    <footer class="sticky bottom-0 z-10 border-t border-default bg-default">
      <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>
