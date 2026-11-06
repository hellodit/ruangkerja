<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const { me } = useMe()
const auth = useAuthSession()
const colorMode = useColorMode()

const links = computed<NavigationMenuItem[][]>(() => [[
  { label: 'Siklus kinerja', type: 'label' },
  { label: 'Beranda', icon: 'i-lucide-house', to: '/beranda' },
  { label: 'RHK saya', icon: 'i-lucide-target', to: '/rhk', badge: me.value?.rhkCount ? String(me.value.rhkCount) : undefined },
  { label: 'Progres harian', icon: 'i-lucide-notebook-pen', to: '/progres' },
  { label: 'Bukti dukung', icon: 'i-lucide-link', to: '/bukti', badge: me.value?.evidenceCount ? String(me.value.evidenceCount) : undefined },
  { label: 'Realisasi periode', icon: 'i-lucide-chart-column', to: '/realisasi' }
], [
  { label: 'Alat bantu', type: 'label' },
  { label: 'Panduan kerja', icon: 'i-lucide-list', disabled: true, badge: 'Segera' },
  { label: 'Asisten AI', icon: 'i-lucide-sparkles', disabled: true, badge: 'Segera' },
  { label: 'Draf SOP', icon: 'i-lucide-files', disabled: true, badge: 'Segera' }
]])

const userItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: me.value?.user.email ?? '', type: 'label' }],
  [
    { label: 'Profil dan pengaturan', icon: 'i-lucide-user', to: '/profil' },
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
    icon: 'i-lucide-log-out',
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
    :min-size="15"
    :default-size="17"
    :max-size="22"
    :ui="{ footer: 'flex-col items-stretch gap-3 border-t border-default py-4' }"
  >
    <template #header="{ collapsed }">
      <NuxtLink to="/beranda" class="rounded-md px-1 focus-visible:outline-2 focus-visible:outline-primary" aria-label="RuangKerja, ke Beranda">
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
    </template>

    <template #footer="{ collapsed }">
      <UDropdownMenu :items="userItems" :content="{ align: 'start', side: 'top' }" :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }">
        <UButton
          color="neutral"
          variant="ghost"
          block
          :square="collapsed"
          class="justify-start gap-2.5 data-[state=open]:bg-elevated"
          :aria-label="`Menu akun ${me?.user.name ?? ''}`"
        >
          <UAvatar :src="me?.user.image ?? undefined" :alt="me?.user.name" size="md" />
          <span v-if="!collapsed" class="flex min-w-0 flex-col text-left">
            <span class="truncate text-sm font-semibold text-highlighted">{{ me?.user.name }}</span>
            <span class="truncate text-xs text-muted">{{ me?.positionTitle || 'Lengkapi profil' }}</span>
          </span>
        </UButton>
      </UDropdownMenu>
      <p v-if="!collapsed" class="px-1 text-[11px] leading-4 text-muted">
        Aplikasi independen. Bukan aplikasi resmi BKN atau e-Kinerja.
      </p>
    </template>
  </UDashboardSidebar>
</template>
