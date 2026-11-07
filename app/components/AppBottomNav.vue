<script setup lang="ts">
/** NFR Mobile: below 740 px the main menu is a bottom navigation bar. */
const route = useRoute()
const items = [
  { label: 'Beranda', icon: 'i-ctm-home', to: '/beranda' },
  { label: 'RHK', icon: 'i-ctm-policy', to: '/rhk' },
  { label: 'Progres', icon: 'i-ctm-notes', to: '/progres' },
  { label: 'Bukti', icon: 'i-ctm-link', to: '/bukti' },
  { label: 'Realisasi', icon: 'i-ctm-analytics', to: '/realisasi' }
]
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <nav
    aria-label="Menu utama"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur min-[740px]:hidden"
  >
    <ul class="grid grid-cols-5">
      <li
        v-for="item in items"
        :key="item.to"
      >
        <ULink
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
          :class="isActive(item.to) ? 'text-highlighted' : 'text-muted'"
        >
          <span
            class="flex h-7 w-12 items-center justify-center rounded-full"
            :class="isActive(item.to) && 'bg-brand-100 dark:bg-brand-950/60'"
          >
            <UIcon
              :name="item.icon"
              class="size-5"
              :class="isActive(item.to) && 'text-brand-ink'"
            />
          </span>
          {{ item.label }}
        </ULink>
      </li>
    </ul>
  </nav>
</template>
