<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

/**
 * Admin panel sidebar: a dark (ink) rail so it is never mistaken for the
 * user's own workspace. Same CTM proportions as AppSidebar (240px, 40px
 * items), inverted colors.
 */
const { me } = useMe()
const auth = useAuthSession()
const colorMode = useColorMode()

const links = computed<NavigationMenuItem[][]>(() => [
  [
    { label: 'Kelola', type: 'label' },
    { label: 'Pengguna', icon: 'i-ctm-user-group', to: '/admin/users' }
  ],
  [
    { label: 'Kembali ke ruang kerja', icon: 'i-ctm-back-01', to: '/beranda' }
  ]
])

const initials = computed(() => (me.value?.user.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join(''))

const userItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: me.value?.user.name ?? '', description: me.value?.user.email ?? '', type: 'label' }],
  [
    { label: 'Ruang kerja saya', icon: 'i-ctm-home', to: '/beranda' },
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

// Inverted Menu Tree: slate text on ink, gold for the current page.
const navUi = {
  label: 'text-slate-500',
  link: 'text-slate-300 hover:text-white hover:before:bg-white/5 data-active:text-brand-300 data-active:before:bg-brand-400/15',
  linkLeadingIcon: 'text-slate-400 group-hover:text-white group-data-active:text-brand-300'
}
</script>

<template>
  <UDashboardSidebar
    id="admin"
    :default-size="15"
    :min-size="15"
    :max-size="15"
    :ui="{
      root: 'bg-[#111216] text-slate-200 border-e border-white/10',
      content: 'bg-[#111216] text-slate-200 divide-white/10',
      toggle: 'text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10',
      header: 'h-auto px-5 pt-5 pb-0',
      body: 'gap-5 px-3 pt-5 pb-6',
      footer: 'border-t border-white/10 p-3'
    }"
  >
    <template #header>
      <NuxtLink
        to="/admin/users"
        class="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-blue-400"
        aria-label="Panel admin RuangKerja"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold tracking-tight text-ink"
          aria-hidden="true"
        >rk</span>
        <span class="flex flex-col">
          <span class="flex items-center gap-2 text-[15px] leading-5 font-bold text-white">
            RuangKerja
            <span class="rounded-full bg-brand-400/20 px-2 text-[11px]/4 font-semibold text-brand-300">Admin</span>
          </span>
          <span class="text-xs text-slate-400">Panel admin</span>
        </span>
      </NuxtLink>
    </template>

    <template #default>
      <UNavigationMenu
        :items="links[0]"
        orientation="vertical"
        aria-label="Menu admin"
        :ui="navUi"
      />
      <UNavigationMenu
        :items="links[1]"
        orientation="vertical"
        aria-label="Pindah ke ruang kerja"
        class="mt-auto"
        :ui="navUi"
      />
    </template>

    <template #footer>
      <UDropdownMenu
        :items="userItems"
        :content="{ align: 'start', side: 'top', sideOffset: 8 }"
        :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-56' }"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-sm p-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-blue-400 data-[state=open]:bg-white/5"
          :aria-label="`Menu akun ${me?.user.name ?? ''}`"
        >
          <UAvatar
            :src="me?.user.image ?? undefined"
            :alt="me?.user.name"
            :text="initials"
            size="lg"
            :ui="{ root: 'shrink-0 bg-brand-800', fallback: 'text-xs font-semibold text-white' }"
          />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-sm/5 font-semibold text-white">{{ me?.user.name }}</span>
            <span class="truncate text-xs/4 text-slate-400">Admin</span>
          </span>
          <UIcon
            name="i-ctm-sort-2"
            class="size-4 shrink-0 text-slate-400"
          />
        </button>
      </UDropdownMenu>
    </template>
  </UDashboardSidebar>
</template>
