<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Transaksi · Admin' })
type Tx = InternalApi['/api/admin/transactions']['get']['transactions'][number]

const route = useRoute()
const router = useRouter()
const today = todayInTimeZone('Asia/Jakarta')

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const qDebounced = refDebounced(q, 300)
const METHODS = ['all', 'manual', 'singapay'] as const
const method = ref<typeof METHODS[number]>(METHODS.find(m => m === route.query.method) ?? 'all')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const pageSize = 25

watch([qDebounced, method], () => {
  page.value = 1
})
watch([qDebounced, method, page], () => {
  router.replace({ query: { ...(qDebounced.value ? { q: qDebounced.value } : {}), ...(method.value !== 'all' ? { method: method.value } : {}), ...(page.value > 1 ? { page: page.value } : {}) } })
})

const { data, status, refresh } = await useFetch('/api/admin/transactions', {
  query: computed(() => ({ q: qDebounced.value || undefined, method: method.value, page: page.value, pageSize })),
  key: 'admin-transactions'
})
const stats = computed(() => data.value?.stats)
const rows = computed(() => data.value?.transactions ?? [])
const total = computed(() => data.value?.total ?? 0)
const rangeText = computed(() => {
  if (!total.value) return 'Tidak ada transaksi'
  const from = (page.value - 1) * pageSize + 1
  return `Menampilkan ${from}–${Math.min(total.value, from + rows.value.length - 1)} dari ${formatNumber(total.value)} transaksi`
})

const assignOpen = ref(false)

const methodFilters = [
  { id: 'all' as const, label: 'Semua' },
  { id: 'manual' as const, label: 'Manual' },
  { id: 'singapay' as const, label: 'SingaPay' }
]
const METHOD_LABEL: Record<Tx['method'], string> = { manual: 'Manual', singapay: 'SingaPay' }
const STATUS: Record<Tx['status'], { label: string, color: 'success' | 'warning' | 'error' | 'neutral' }> = {
  paid: { label: 'Lunas', color: 'success' },
  pending: { label: 'Menunggu', color: 'warning' },
  failed: { label: 'Gagal', color: 'error' },
  refunded: { label: 'Dikembalikan', color: 'neutral' }
}
const day = (ts: string | Date) => todayInTimeZone('Asia/Jakarta', new Date(ts))
const isRunning = (t: Tx) => t.status === 'paid' && !!t.periodStart && !!t.periodEnd && new Date(t.periodStart) <= new Date() && new Date(t.periodEnd) > new Date()

const columns: TableColumn<Tx>[] = [
  { id: 'date', header: 'Tanggal' },
  { id: 'user', header: 'Pengguna' },
  { id: 'package', header: 'Paket dan masa aktif' },
  { id: 'amount', header: 'Nominal' },
  { id: 'method', header: 'Metode' },
  { id: 'note', header: 'Referensi dan catatan' }
]
</script>

<template>
  <UDashboardPanel id="admin-transactions">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs/4 text-toned">Admin</span>
            <h1 class="text-xl/7 font-semibold tracking-[-0.2px] text-highlighted">
              Transaksi
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full max-w-[1200px] flex-col gap-6">
        <div
          v-if="stats"
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Pendapatan bulan ini"
            icon="i-ctm-currencies"
            :value="formatRupiah(stats.revenueThisMonth)"
            :note="`Sejak 1 ${formatDate(today).split(' ').slice(1).join(' ')}`"
          />
          <KpiCard
            label="Total pendapatan"
            icon="i-ctm-analytics"
            :value="formatRupiah(stats.revenue)"
            note="Semua transaksi lunas"
          />
          <KpiCard
            label="Transaksi lunas"
            icon="i-ctm-credit-cards"
            :value="formatNumber(stats.count)"
            note="Manual dan SingaPay"
          />
          <KpiCard
            label="Pelanggan aktif"
            icon="i-ctm-user-check"
            :value="formatNumber(stats.activeUsers)"
            note="Masa aktif paket masih berjalan"
          />
        </div>

        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <UInput
              v-model="q"
              icon="i-ctm-search"
              placeholder="Cari pengguna, paket, atau referensi"
              class="w-full sm:w-80"
              aria-label="Cari transaksi"
            />
            <div
              role="group"
              aria-label="Saring metode"
              class="flex flex-wrap gap-2"
            >
              <UButton
                v-for="f in methodFilters"
                :key="f.id"
                color="neutral"
                variant="outline"
                class="h-[30px] rounded-full px-3 text-sm/5 font-normal ring-default"
                :class="method === f.id && 'bg-brand-100 text-brand-ink ring-brand-700 hover:bg-brand-100 dark:bg-brand-950/50'"
                :aria-pressed="method === f.id"
                @click="method = f.id"
              >
                {{ f.label }}
              </UButton>
            </div>
            <UButton
              icon="i-ctm-plus"
              class="ml-auto"
              @click="assignOpen = true"
            >
              Assign paket
            </UButton>
          </div>

          <UTable
            :data="rows"
            :columns="columns"
            :loading="status === 'pending'"
            class="rounded-md border border-default"
          >
            <template #empty>
              <UEmpty
                icon="i-ctm-credit-cards"
                title="Belum ada transaksi"
                description="Assign paket ke pengguna untuk mencatat transaksi manual."
                variant="naked"
              />
            </template>
            <template #date-cell="{ row }">
              <div class="flex flex-col whitespace-nowrap">
                <span class="text-highlighted">{{ formatDateShort(day(row.original.createdAt)) }}</span>
                <span class="text-[13px]/[18px] text-toned">{{ row.original.createdByName ? `oleh ${row.original.createdByName}` : '' }}</span>
              </div>
            </template>
            <template #user-cell="{ row }">
              <div class="flex max-w-56 flex-col">
                <span class="font-semibold text-highlighted">{{ row.original.userName }}</span>
                <span class="truncate text-[13px]/[18px] text-toned">{{ row.original.userEmail }}</span>
              </div>
            </template>
            <template #package-cell="{ row }">
              <div class="flex flex-col gap-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="text-highlighted">{{ row.original.packageName }}</span>
                  <UBadge
                    v-if="isRunning(row.original)"
                    color="success"
                    variant="subtle"
                    size="sm"
                    class="rounded-full"
                  >Berjalan</UBadge>
                </span>
                <span
                  v-if="row.original.periodStart && row.original.periodEnd"
                  class="text-[13px]/[18px] whitespace-nowrap text-toned"
                >{{ formatDateShort(day(row.original.periodStart)) }} – {{ formatDateShort(day(row.original.periodEnd)) }}</span>
              </div>
            </template>
            <template #amount-cell="{ row }">
              <div class="flex flex-col items-start gap-1">
                <span class="font-semibold whitespace-nowrap text-highlighted tabular-nums">{{ formatRupiah(row.original.amount) }}</span>
                <StatusChip
                  v-if="row.original.status !== 'paid'"
                  :color="STATUS[row.original.status].color"
                >
                  {{ STATUS[row.original.status].label }}
                </StatusChip>
              </div>
            </template>
            <template #method-cell="{ row }">
              <UBadge
                color="neutral"
                variant="soft"
                size="sm"
              >
                {{ METHOD_LABEL[row.original.method] }}
              </UBadge>
            </template>
            <template #note-cell="{ row }">
              <div class="flex max-w-60 flex-col">
                <span class="text-highlighted">{{ row.original.reference || '—' }}</span>
                <span
                  v-if="row.original.notes"
                  class="text-[13px]/[18px] text-toned"
                >{{ row.original.notes }}</span>
              </div>
            </template>
          </UTable>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="text-sm text-toned">{{ rangeText }}</span>
            <UPagination
              v-if="total > pageSize"
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
            />
          </div>
        </UCard>
      </div>

      <AssignPackageModal
        v-model:open="assignOpen"
        @saved="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
