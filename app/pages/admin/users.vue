<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'
import { ADMIN_USER_FILTERS, type AdminUserFilter } from '#shared/schemas/admin'

useSeoMeta({ title: 'Pengguna · Admin' })
type AdminUser = InternalApi['/api/admin/users']['get']['users'][number]

const route = useRoute()
const router = useRouter()
const { me } = useMe()
const today = computed(() => me.value?.today ?? todayInTimeZone('Asia/Jakarta'))

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const qDebounced = refDebounced(q, 300)
const filter = ref<AdminUserFilter>(ADMIN_USER_FILTERS.find(f => f === route.query.filter) ?? 'all')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const pageSize = 25

watch([qDebounced, filter], () => {
  page.value = 1
})
watch([qDebounced, filter, page], () => {
  router.replace({ query: { ...(qDebounced.value ? { q: qDebounced.value } : {}), ...(filter.value !== 'all' ? { filter: filter.value } : {}), ...(page.value > 1 ? { page: page.value } : {}) } })
})

const { data, status, error } = await useFetch('/api/admin/users', {
  query: computed(() => ({ q: qDebounced.value || undefined, filter: filter.value, page: page.value, pageSize })),
  key: 'admin-users'
})

const stats = computed(() => data.value?.stats)
const users = computed(() => data.value?.users ?? [])
const total = computed(() => data.value?.total ?? 0)
const rangeText = computed(() => {
  if (!total.value) return 'Tidak ada pengguna'
  const from = (page.value - 1) * pageSize + 1
  return `Menampilkan ${from}–${Math.min(total.value, from + users.value.length - 1)} dari ${formatNumber(total.value)} pengguna`
})
const pct = (n: number) => (stats.value?.total ? `${Math.round((n / stats.value.total) * 100)}%` : '0%')

const filters: { id: AdminUserFilter, label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'unverified', label: 'Belum verifikasi' },
  { id: 'not_onboarded', label: 'Belum onboarding' },
  { id: 'admin', label: 'Admin' }
]

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
const providerLabel = (p: string) => ({ credential: 'Email', google: 'Google' } as Record<string, string>)[p] ?? p
const dateOf = (ts: string | Date) => todayInTimeZone('Asia/Jakarta', new Date(ts))

const columns: TableColumn<AdminUser>[] = [
  { id: 'user', header: 'Pengguna' },
  { id: 'work', header: 'Instansi dan jabatan' },
  { id: 'status', header: 'Status' },
  { id: 'providers', header: 'Masuk lewat' },
  { id: 'activity', header: 'Aktivitas' },
  { id: 'lastSeen', header: 'Terakhir aktif' }
]
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs/4 text-toned">Admin</span>
            <h1 class="text-xl/7 font-semibold tracking-[-0.2px] text-highlighted">
              Pengguna
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full max-w-[1200px] flex-col gap-6">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-ctm-alert-circle"
          title="Daftar pengguna gagal dimuat"
          :description="error.statusMessage || 'Coba muat ulang halaman.'"
        />

        <div
          v-if="stats"
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Total pengguna"
            icon="i-ctm-user-group"
            :value="formatNumber(stats.total)"
            :note="`${formatNumber(stats.newThisWeek)} mendaftar 7 hari terakhir`"
          />
          <KpiCard
            label="Email terverifikasi"
            icon="i-ctm-checkmark-circle"
            :value="formatNumber(stats.verified)"
            :note="`${pct(stats.verified)} dari semua pengguna`"
          />
          <KpiCard
            label="Selesai onboarding"
            icon="i-ctm-policy"
            :value="formatNumber(stats.onboarded)"
            :note="`${pct(stats.onboarded)} dari semua pengguna`"
          />
          <KpiCard
            label="Aktif 7 hari terakhir"
            icon="i-ctm-analytics"
            :value="formatNumber(stats.activeThisWeek)"
            note="Pengguna dengan sesi masuk minggu ini"
          />
        </div>

        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <UInput
              v-model="q"
              icon="i-ctm-search"
              placeholder="Cari nama atau email"
              class="w-full sm:w-80"
              aria-label="Cari pengguna"
            />
            <div
              role="group"
              aria-label="Saring pengguna"
              class="flex flex-wrap gap-2"
            >
              <UButton
                v-for="f in filters"
                :key="f.id"
                color="neutral"
                variant="outline"
                class="h-[30px] rounded-full px-3 text-sm/5 font-normal ring-default"
                :class="filter === f.id && 'bg-brand-100 text-brand-ink ring-brand-700 hover:bg-brand-100 dark:bg-brand-950/50'"
                :aria-pressed="filter === f.id"
                @click="filter = f.id"
              >
                {{ f.label }}
              </UButton>
            </div>
            <span class="ml-auto text-sm text-toned">{{ rangeText }}</span>
          </div>

          <UTable
            :data="users"
            :columns="columns"
            :loading="status === 'pending'"
            class="rounded-md border border-default"
          >
            <template #empty>
              <UEmpty
                icon="i-ctm-user-group"
                title="Tidak ada pengguna yang cocok"
                description="Ubah kata kunci atau saringan."
                variant="naked"
              />
            </template>
            <template #user-cell="{ row }">
              <div class="flex min-w-52 items-center gap-3">
                <UAvatar
                  :src="row.original.image ?? undefined"
                  :alt="row.original.name"
                  :text="initials(row.original.name)"
                  size="md"
                  :ui="{ root: 'shrink-0 bg-brand-800', fallback: 'text-xs font-semibold text-white' }"
                />
                <div class="flex min-w-0 flex-col">
                  <span class="flex items-center gap-2 font-semibold text-highlighted">
                    <span class="truncate">{{ row.original.name }}</span>
                    <UBadge
                      v-if="row.original.role === 'admin'"
                      color="primary"
                      variant="soft"
                      size="sm"
                    >Admin</UBadge>
                  </span>
                  <span class="truncate text-[13px]/[18px] text-toned">{{ row.original.email }}</span>
                </div>
              </div>
            </template>
            <template #work-cell="{ row }">
              <div
                v-if="row.original.agency || row.original.positionTitle"
                class="flex max-w-60 flex-col"
              >
                <span class="text-highlighted">{{ row.original.agency || '—' }}</span>
                <span class="text-[13px]/[18px] text-toned">{{ row.original.positionTitle || '—' }}</span>
              </div>
              <span
                v-else
                class="text-muted"
              >Belum diisi</span>
            </template>
            <template #status-cell="{ row }">
              <div class="flex flex-col items-start gap-1.5">
                <StatusChip :color="row.original.emailVerified ? 'success' : 'warning'">
                  {{ row.original.emailVerified ? 'Terverifikasi' : 'Belum verifikasi' }}
                </StatusChip>
                <StatusChip
                  v-if="!row.original.onboardingCompletedAt"
                  color="neutral"
                >
                  Belum onboarding
                </StatusChip>
              </div>
            </template>
            <template #providers-cell="{ row }">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="p in row.original.providers"
                  :key="p"
                  color="neutral"
                  variant="soft"
                  size="sm"
                >
                  {{ providerLabel(p) }}
                </UBadge>
              </div>
            </template>
            <template #activity-cell="{ row }">
              <div class="flex flex-col whitespace-nowrap">
                <span class="text-highlighted tabular-nums">{{ formatNumber(row.original.rhkCount) }} RHK · {{ formatNumber(row.original.progressCount) }} progres</span>
                <span class="text-[13px]/[18px] text-toned">{{ row.original.lastProgressAt ? `Progres terakhir ${formatDaysAgo(row.original.lastProgressAt, today).toLowerCase()}` : 'Belum ada progres' }}</span>
              </div>
            </template>
            <template #lastSeen-cell="{ row }">
              <div class="flex flex-col whitespace-nowrap">
                <span class="text-highlighted">{{ row.original.lastSeenAt ? formatDaysAgo(row.original.lastSeenAt, today) : 'Belum pernah' }}</span>
                <span class="text-[13px]/[18px] text-toned">Daftar {{ formatDateShort(dateOf(row.original.createdAt)) }}</span>
              </div>
            </template>
          </UTable>

          <div
            v-if="total > pageSize"
            class="flex justify-end"
          >
            <UPagination
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
            />
          </div>
        </UCard>

        <p class="text-xs text-muted">
          Hanya data akun dasar yang ditampilkan. NIP, tanggal lahir, alamat, nomor HP, dan isi pekerjaan pengguna tidak dibuka di panel ini.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
