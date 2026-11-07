<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

/**
 * Sidebar 1:1 with the canvas "Sidebar" artboard (CTM Menu Tree): 240px,
 * padding 20/12/24, 20px gaps. The account switcher sits in the footer,
 * pinned to the bottom like most dashboards. The collapse toggle lives in
 * the sidebar header so page headers stay 1:1 with the canvas.
 */
const collapsed = ref(false)
const { me } = useMe()
const auth = useAuthSession()
const colorMode = useColorMode()
const toast = useToast()

function comingSoon(label: string) {
  toast.add({ title: `${label} hadir di fase berikutnya`, icon: 'i-ctm-sparkles', color: 'neutral' })
}

// Chip "Segera"/"Beta" = CTM chip--field at 11/16, padding 0 8.
const chip = (label: string) => ({ label, class: 'h-4 px-2 font-medium' })

const links = computed<NavigationMenuItem[][]>(() => [[
  { label: 'Siklus kinerja', type: 'label' },
  { label: 'Beranda', icon: 'i-ctm-home', to: '/beranda' },
  { label: 'RHK saya', icon: 'i-ctm-policy', to: '/rhk', badge: me.value?.rhkCount ? String(me.value.rhkCount) : undefined },
  { label: 'Progres harian', icon: 'i-ctm-notes', to: '/progres' },
  { label: 'Bukti dukung', icon: 'i-ctm-link', to: '/bukti', badge: me.value?.evidenceCount ? String(me.value.evidenceCount) : undefined },
  { label: 'Realisasi periode', icon: 'i-ctm-analytics', to: '/realisasi' },
  { label: 'Alat bantu', type: 'label' },
  { label: 'Panduan kerja', icon: 'i-ctm-list-bullet', onSelect: () => comingSoon('Panduan kerja') },
  { label: 'Asisten AI', icon: 'i-ctm-sparkles', badge: chip('Segera'), onSelect: () => comingSoon('Asisten AI') },
  { label: 'Draf SOP', icon: 'i-ctm-files-01', badge: chip('Beta'), onSelect: () => comingSoon('Draf SOP') }
]])

const initials = computed(() => (me.value?.user.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join(''))

const userItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: me.value?.user.name ?? '', description: me.value?.user.email ?? '', type: 'label', slot: 'account' as const }],
  [
    { label: 'Profil dan pengaturan', icon: 'i-ctm-user', to: '/profil' },
    { label: 'Kebijakan privasi', icon: 'i-ctm-square-lock-01', to: '/privasi' },
    {
      label: colorMode.value === 'dark' ? 'Tampilan terang' : 'Tampilan gelap',
      icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
      onSelect: () => {
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
      }
    }
  ],
  [{
    label: 'Keluar',
    icon: 'i-ctm-logout',
    color: 'error',
    onSelect: async () => {
      await auth.signOut()
      await navigateTo('/login')
    }
  }]
])
</script>

<template>
  <UDashboardSidebar
    id="main"
    v-model:collapsed="collapsed"
    collapsible
    :default-size="15"
    :min-size="15"
    :max-size="15"
    :collapsed-size="5"
    :ui="{
      root: 'bg-default border-e border-default',
      header: collapsed ? 'h-auto px-2 pt-5 pb-0' : 'h-auto px-5 pt-5 pb-0',
      body: collapsed ? 'gap-5 px-2 pt-5 pb-6' : 'gap-5 px-3 pt-5 pb-6',
      footer: collapsed ? 'border-t border-default p-2' : 'border-t border-default p-3'
    }"
  >
    <template #header>
      <div
        class="flex w-full items-center gap-2"
        :class="collapsed ? 'flex-col' : 'justify-between'"
      >
        <NuxtLink
          to="/beranda"
          class="rounded-md focus-visible:outline-2 focus-visible:outline-blue-700"
          aria-label="RuangKerja, ke Beranda"
        >
          <AppLogo :collapsed="collapsed" />
        </NuxtLink>
        <UDashboardSidebarCollapse
          size="sm"
          class="max-lg:hidden"
          :aria-label="collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'"
        />
      </div>
    </template>

    <template #default>
      <UNavigationMenu
        :collapsed="collapsed"
        :items="links"
        orientation="vertical"
        tooltip
        aria-label="Menu utama"
      />
    </template>

    <template #footer>
      <UDropdownMenu
        :items="userItems"
        :content="{ align: 'start', side: 'top', sideOffset: 8 }"
        :ui="{ content: collapsed ? 'w-60' : 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-sm p-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-700 data-[state=open]:bg-muted"
          :class="collapsed && 'justify-center px-0'"
          :aria-label="`Menu akun ${me?.user.name ?? ''}`"
        >
          <UAvatar
            :src="me?.user.image ?? undefined"
            :alt="me?.user.name"
            :text="initials"
            size="lg"
            :ui="{ root: 'shrink-0 bg-brand-800', fallback: 'text-xs font-semibold text-white' }"
          />
          <template v-if="!collapsed">
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-sm/5 font-semibold text-highlighted">{{ me?.user.name }}</span>
              <span class="truncate text-xs/4 text-muted">{{ me?.positionTitle || 'Lengkapi profil' }}</span>
            </span>
            <UIcon
              name="i-ctm-sort-2"
              class="size-4 shrink-0 text-muted"
            />
          </template>
        </button>

        <template #account>
          <div class="flex min-w-0 items-center gap-2.5">
            <UAvatar
              :src="me?.user.image ?? undefined"
              :alt="me?.user.name"
              :text="initials"
              size="md"
              :ui="{ root: 'shrink-0 bg-brand-800', fallback: 'text-xs font-semibold text-white' }"
            />
            <span class="flex min-w-0 flex-col text-start">
              <span class="truncate text-sm/5 font-semibold text-highlighted">{{ me?.user.name }}</span>
              <span class="truncate text-xs/4 font-normal text-muted">{{ me?.user.email }}</span>
            </span>
          </div>
        </template>
      </UDropdownMenu>
    </template>
  </UDashboardSidebar>
</template>
