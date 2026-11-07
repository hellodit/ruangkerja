<script setup lang="ts">
/**
 * Brand logo from public/images/logo (see its README for which file goes where).
 * - horizontal: headers and the open sidebar; mark: collapsed sidebar; stacked: auth brand panel.
 * - surface "auto" swaps to the -dark artwork with the color mode via CSS (no flash, SSR-safe);
 *   "dark" always uses it, for surfaces that stay dark in both modes (the admin rail).
 */
const props = withDefaults(defineProps<{
  variant?: 'horizontal' | 'mark' | 'stacked'
  surface?: 'auto' | 'dark'
}>(), { variant: 'horizontal', surface: 'auto' })

// Intrinsic sizes from each SVG's width/height, so the box is reserved before it loads.
// horizontal is 32px tall (133px wide) but may shrink with its parent: sidebars are 15% of
// the viewport, so at 1280px there are only ~150px beside the collapse button.
const ART = {
  horizontal: { width: 166, height: 40, class: 'h-auto w-[133px] max-w-full' },
  mark: { width: 64, height: 64, class: 'size-8 shrink-0' },
  stacked: { width: 176, height: 123, class: 'h-28 w-auto' }
} as const

const art = computed(() => ART[props.variant])
const src = (dark: boolean) => `/images/logo/logo-${props.variant}${dark ? '-dark' : ''}.svg`
</script>

<template>
  <img
    v-if="surface === 'dark'"
    :src="src(true)"
    :width="art.width"
    :height="art.height"
    alt="Ruang Kerja"
    :class="art.class"
  >
  <template v-else>
    <img
      :src="src(false)"
      :width="art.width"
      :height="art.height"
      alt="Ruang Kerja"
      :class="[art.class, 'dark:hidden']"
    >
    <img
      :src="src(true)"
      :width="art.width"
      :height="art.height"
      alt="Ruang Kerja"
      :class="[art.class, 'hidden dark:block']"
    >
  </template>
</template>
