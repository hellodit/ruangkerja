<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

/**
 * Sidebar 1:1 with the canvas "Sidebar" artboard (CTM Menu Tree): 240px,
 * padding 20/12/24, 20px gaps, user block right below the menu.
 */
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
  [{ label: me.value?.user.email ?? '', type: 'label' }],
  [
    { label: 'Profil dan pengaturan', icon: 'i-ctm-user', to: '/profil' },
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
    collapsible
    :default-size="15"
    :min-size="15"
    :max-size="15"
    :collapsed-size="4"
    :ui="{
      root: 'bg-default border-e border-default',
      header: 'h-auto px-5 pt-5 pb-0',
      body: 'gap-5 px-3 pt-5 pb-6'
    }"
  >
    <template #header="{ collapsed }">
      <NuxtLink
        to="/beranda"
        class="rounded-md focus-visible:outline-2 focus-visible:outline-blue-700"
        aria-label="RuangKerja, ke Beranda"
      >
        <AppLogo :collapsed="collapsed" />
      </NuxtLink>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :collapsed="collapsed"
        :items="links"
        orientation="vertical"
        tooltip
        aria-label="Menu utama"
      />

      <div class="flex flex-col gap-3 border-t border-default px-2 pt-4">
        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'start', side: 'top' }"
          :ui="{ content: 'min-w-56' }"
        >
          <button
            type="button"
            class="-m-1 flex items-center gap-2.5 rounded-sm p-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-blue-700"
            :aria-label="`Menu akun ${me?.user.name ?? ''}`"
          >
            <UAvatar
              :src="me?.user.image ?? undefined"
              :alt="me?.user.name"
              :text="initials"
              size="xl"
              :ui="{ root: 'shrink-0 bg-brand-800', fallback: 'text-sm/5 font-medium text-white' }"
            />
            <span
              v-if="!collapsed"
              class="flex min-w-0 flex-col"
            >
              <span class="truncate text-sm/5 font-semibold text-highlighted">{{ me?.user.name }}</span>
              <span class="text-xs text-muted">{{ me?.positionTitle || 'Lengkapi profil' }}</span>
            </span>
          </button>
        </UDropdownMenu>
        <p
          v-if="!collapsed"
          class="text-[11px]/4 text-muted"
        >
          <ULink
            to="/privasi"
            class="underline underline-offset-2 hover:text-default"
          >
            Kebijakan privasi
          </ULink>
        </p>
      </div>
    </template>
  </UDashboardSidebar>
</template>
