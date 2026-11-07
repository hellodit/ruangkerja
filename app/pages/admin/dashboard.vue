<script setup lang="ts">
import { DASHBOARD_RANGES } from '#shared/schemas/admin'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Dashboard · Admin' })

const route = useRoute()
const router = useRouter()
const days = ref<number>(DASHBOARD_RANGES.find(d => d === Number(route.query.days)) ?? 30)
watch(days, d => router.replace({ query: d === 30 ? {} : { days: d } }))
const rangeTabs = DASHBOARD_RANGES.map(d => ({ label: `${d} hari`, value: d }))

const { data, status } = await useFetch('/api/admin/dashboard', { query: computed(() => ({ days: days.value })), key: 'admin-dashboard' })
const k = computed(() => data.value?.kpis)
const today = computed(() => data.value?.today ?? todayInTimeZone('Asia/Jakarta'))
const signups = computed(() => (data.value?.series ?? []).map(s => ({ day: s.day, value: s.signups })))
const revenue = computed(() => (data.value?.series ?? []).map(s => ({ day: s.day, value: s.revenue })))
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '0%')
const maxPackageUsers = computed(() => Math.max(1, ...(data.value?.packages ?? []).map(p => p.users)))
const day = (ts: string | Date | null) => (ts ? todayInTimeZone('Asia/Jakarta', new Date(ts)) : today.value)
const people = (n: number) => `${formatNumber(n)} pengguna`
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
</script>

<template>
  <UDashboardPanel id="admin-dashboard">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs/4 text-toned">Admin</span>
            <h1 class="text-xl/7 font-semibold tracking-[-0.2px] text-highlighted">
              Dashboard
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full max-w-[1200px] flex-col gap-6">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p class="flex-1 basis-60 text-sm text-toned">
            Ringkasan pengguna dan pendapatan Ruang Kerja. Hari dihitung dalam WIB.
          </p>
          <UTabs
            v-model="days"
            :items="rangeTabs"
            :content="false"
            class="w-auto"
            aria-label="Rentang waktu"
          />
        </div>

        <div
          v-if="k"
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Total pengguna"
            icon="i-ctm-user-group"
            :value="formatNumber(k.totalUsers)"
            :note="`${formatNumber(k.newUsers)} baru dalam ${days} hari`"
          />
          <KpiCard
            label="Aktif 7 hari terakhir"
            icon="i-ctm-analytics"
            :value="formatNumber(k.activeUsers7d)"
            :note="`${pct(k.activeUsers7d, k.totalUsers)} dari semua pengguna · ${pct(k.onboarded, k.totalUsers)} selesai onboarding`"
          />
          <KpiCard
            label="Pelanggan aktif"
            icon="i-ctm-user-check"
            :value="formatNumber(k.subscribers)"
            :note="`${pct(k.subscribers, k.totalUsers)} pengguna punya paket aktif`"
          />
          <KpiCard
            label="Pendapatan bulan ini"
            icon="i-ctm-currencies"
            :value="formatRupiah(k.revenueThisMonth)"
            :note="`${formatRupiah(k.revenue)} dari ${formatNumber(k.transactions)} transaksi dalam ${days} hari`"
          />
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-lg/[26px] font-semibold text-highlighted">
                  Pendaftaran
                </h2>
                <span class="text-sm text-toned">{{ formatNumber(k?.newUsers ?? 0) }} pengguna baru · {{ days }} hari</span>
              </div>
            </template>
            <AdminBarChart
              title="Pendaftaran pengguna per hari"
              :points="signups"
              :format="people"
              :axis-format="formatNumber"
              :today="today"
              :class="status === 'pending' && 'opacity-60'"
            />
          </UCard>
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-lg/[26px] font-semibold text-highlighted">
                  Pendapatan
                </h2>
                <span class="text-sm text-toned">{{ formatRupiah(k?.revenue ?? 0) }} · {{ days }} hari</span>
              </div>
            </template>
            <AdminBarChart
              title="Pendapatan per hari"
              :points="revenue"
              :format="formatRupiah"
              :axis-format="formatRupiahCompact"
              :today="today"
              :class="status === 'pending' && 'opacity-60'"
            />
          </UCard>
        </div>

        <div class="grid items-start gap-6 lg:grid-cols-3">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg/[26px] font-semibold text-highlighted">
                  Paket aktif
                </h2>
                <UButton
                  to="/admin/packages"
                  variant="ghost"
                  size="sm"
                  trailing-icon="i-ctm-chevron-right"
                >
                  Paket
                </UButton>
              </div>
            </template>
            <p
              v-if="!data?.packages.length"
              class="text-sm text-muted"
            >
              Belum ada pengguna dengan paket aktif.
            </p>
            <ul
              v-else
              class="flex flex-col gap-4"
            >
              <li
                v-for="p in data.packages"
                :key="p.name"
                class="flex flex-col gap-1.5"
              >
                <div class="flex justify-between gap-2 text-sm">
                  <span class="font-semibold text-highlighted">{{ p.name }}</span>
                  <span class="text-highlighted tabular-nums">{{ formatNumber(p.users) }} pengguna</span>
                </div>
                <UProgress
                  :model-value="Math.round((p.users / maxPackageUsers) * 100)"
                  size="sm"
                  :aria-label="`${p.name}: ${p.users} pengguna aktif`"
                />
              </li>
            </ul>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg/[26px] font-semibold text-highlighted">
                  Transaksi terbaru
                </h2>
                <UButton
                  to="/admin/transactions"
                  variant="ghost"
                  size="sm"
                  trailing-icon="i-ctm-chevron-right"
                >
                  Semua
                </UButton>
              </div>
            </template>
            <p
              v-if="!data?.recentTransactions.length"
              class="text-sm text-muted"
            >
              Belum ada transaksi.
            </p>
            <ul
              v-else
              class="divide-y divide-default border-t border-default"
            >
              <li
                v-for="t in data.recentTransactions"
                :key="t.id"
                class="flex items-center justify-between gap-3 py-3"
              >
                <div class="flex min-w-0 flex-col">
                  <span class="truncate text-sm font-semibold text-highlighted">{{ t.userName }}</span>
                  <span class="truncate text-xs/[18px] text-toned">{{ t.packageName }} · {{ formatDaysAgo(t.paidAt ?? today, today) }}</span>
                </div>
                <span class="text-sm font-semibold whitespace-nowrap text-highlighted tabular-nums">{{ formatRupiah(t.amount) }}</span>
              </li>
            </ul>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-lg/[26px] font-semibold text-highlighted">
                  Segera berakhir
                </h2>
                <span class="text-xs text-muted">7 hari ke depan</span>
              </div>
            </template>
            <p
              v-if="!data?.expiringSoon.length"
              class="text-sm text-muted"
            >
              Tidak ada paket yang berakhir dalam 7 hari tanpa perpanjangan.
            </p>
            <ul
              v-else
              class="divide-y divide-default border-t border-default"
            >
              <li
                v-for="e in data.expiringSoon"
                :key="e.userId"
                class="flex items-center justify-between gap-3 py-3"
              >
                <div class="flex min-w-0 flex-col">
                  <span class="truncate text-sm font-semibold text-highlighted">{{ e.name }}</span>
                  <span class="truncate text-xs/[18px] text-toned">{{ e.email }}</span>
                </div>
                <StatusChip color="warning">
                  {{ formatDayMonth(day(e.until)) }}
                </StatusChip>
              </li>
            </ul>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg/[26px] font-semibold text-highlighted">
                Pendaftar terbaru
              </h2>
              <UButton
                to="/admin/users"
                variant="ghost"
                size="sm"
                trailing-icon="i-ctm-chevron-right"
              >
                Semua pengguna
              </UButton>
            </div>
          </template>
          <ul class="grid gap-x-6 border-t border-default sm:grid-cols-2 lg:grid-cols-5">
            <li
              v-for="u in data?.recentSignups ?? []"
              :key="u.id"
              class="flex min-w-0 items-center gap-3 border-b border-default py-3 lg:border-b-0"
            >
              <UAvatar
                :text="initials(u.name)"
                :alt="u.name"
                size="md"
                :ui="{ root: 'shrink-0 bg-brand-800', fallback: 'text-xs font-semibold text-white' }"
              />
              <div class="flex min-w-0 flex-col">
                <span class="truncate text-sm font-semibold text-highlighted">{{ u.name }}</span>
                <span class="truncate text-xs/[18px] text-toned">{{ formatDaysAgo(u.createdAt, today) }}{{ u.onboarded ? '' : ' · belum onboarding' }}</span>
              </div>
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
