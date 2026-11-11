<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Transaksi · Admin' })
type Tx = InternalApi['/api/admin/transactions']['get']['transactions'][number]

const route = useRoute()
const router = useRouter()
const today = todayInTimeZone('Asia/Jakarta')

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const qDebounced = refDebounced(q, 300)
const METHODS = ['all', 'manual', 'sumopay'] as const
const method = ref<typeof METHODS[number]>(METHODS.find(m => m === route.query.method) ?? 'all')
const STATUSES = ['all', 'pending', 'paid'] as const
const statusFilter = ref<typeof STATUSES[number]>(STATUSES.find(m => m === route.query.status) ?? 'all')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const pageSize = 25

watch([qDebounced, method, statusFilter], () => {
  page.value = 1
})
watch([qDebounced, method, statusFilter, page], () => {
  router.replace({ query: { ...(qDebounced.value ? { q: qDebounced.value } : {}), ...(method.value !== 'all' ? { method: method.value } : {}), ...(statusFilter.value !== 'all' ? { status: statusFilter.value } : {}), ...(page.value > 1 ? { page: page.value } : {}) } })
})

const { data, status, refresh } = await useFetch('/api/admin/transactions', {
  query: computed(() => ({ q: qDebounced.value || undefined, method: method.value, status: statusFilter.value, page: page.value, pageSize })),
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

const statusFilters = computed(() => [
  { id: 'all' as const, label: 'Semua' },
  { id: 'pending' as const, label: stats.value?.pending ? `Menunggu · ${stats.value.pending}` : 'Menunggu' },
  { id: 'paid' as const, label: 'Lunas' }
])
const methodFilters = [
  { id: 'all' as const, label: 'Semua metode' },
  { id: 'manual' as const, label: 'Manual' },
  { id: 'sumopay' as const, label: 'SumoPay' }
]

// Pending self-checkout orders: confirm the transfer arrived, or cancel.
const notify = useNotify()
const confirming = ref<Tx | null>(null)
const confirmRef = ref('')
const actionBusy = ref(false)
function openConfirm(t: Tx) {
  confirming.value = t
  confirmRef.value = ''
}
async function confirmPaid() {
  if (!confirming.value) return
  actionBusy.value = true
  try {
    const res = await $fetch(`/api/admin/transactions/${confirming.value.id}/confirm`, { method: 'POST', body: { reference: confirmRef.value || null } })
    notify.success(`Lunas. ${confirming.value.packageName} aktif sampai ${formatDateLong(day(res.periodEnd!))}`)
    confirming.value = null
    await refresh()
  } catch (err) {
    notify.error(err)
  } finally {
    actionBusy.value = false
  }
}
async function cancelOrder(t: Tx) {
  try {
    await $fetch(`/api/admin/transactions/${t.id}/cancel`, { method: 'POST' })
    notify.success(`Pesanan ${t.code ?? ''} dibatalkan`)
    await refresh()
  } catch (err) {
    notify.error(err)
  }
}
const pendingMenu = (t: Tx): DropdownMenuItem[][] => [
  [{ label: 'Konfirmasi lunas', icon: 'i-ctm-checkmark-circle', onSelect: () => openConfirm(t) }],
  [{ label: 'Batalkan pesanan', icon: 'i-ctm-close', color: 'error', onSelect: () => cancelOrder(t) }]
]
const METHOD_LABEL: Record<Tx['method'], string> = { manual: 'Manual', sumopay: 'SumoPay' }
const STATUS: Record<Tx['status'], { label: string, color: 'success' | 'warning' | 'error' | 'neutral' }> = {
  paid: { label: 'Lunas', color: 'success' },
  pending: { label: 'Menunggu', color: 'warning' },
  failed: { label: 'Gagal', color: 'error' },
  refunded: { label: 'Dikembalikan', color: 'neutral' },
  cancelled: { label: 'Dibatalkan', color: 'neutral' }
}
const day = (ts: string | Date) => todayInTimeZone('Asia/Jakarta', new Date(ts))
const isRunning = (t: Tx) => t.status === 'paid' && !!t.periodStart && !!t.periodEnd && new Date(t.periodStart) <= new Date() && new Date(t.periodEnd) > new Date()

const columns: TableColumn<Tx>[] = [
  { id: 'date', header: 'Tanggal' },
  { id: 'user', header: 'Pengguna' },
  { id: 'package', header: 'Paket dan masa aktif' },
  { id: 'amount', header: 'Nominal' },
  { id: 'method', header: 'Metode' },
  { id: 'note', header: 'Referensi dan catatan' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Aksi'), meta: { class: { th: 'w-12 px-2', td: 'px-2' } } }
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
            note="Manual dan SumoPay"
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
              aria-label="Saring status"
              class="flex flex-wrap gap-2"
            >
              <UButton
                v-for="f in statusFilters"
                :key="f.id"
                color="neutral"
                variant="outline"
                class="h-[30px] rounded-full px-3 text-sm/5 font-normal ring-default"
                :class="statusFilter === f.id && 'bg-brand-100 text-brand-ink ring-brand-700 hover:bg-brand-100 dark:bg-brand-950/50'"
                :aria-pressed="statusFilter === f.id"
                @click="statusFilter = f.id"
              >
                {{ f.label }}
              </UButton>
            </div>
            <USelect
              v-model="method"
              :items="methodFilters.map(f => ({ label: f.label, value: f.id }))"
              class="w-44"
              aria-label="Saring metode"
            />
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
                <span
                  v-if="row.original.code"
                  class="font-mono text-[13px]/[18px] text-highlighted"
                >{{ row.original.code }}</span>
                <span :class="row.original.code ? 'text-[13px]/[18px] text-toned' : 'text-highlighted'">{{ row.original.reference || (row.original.code ? 'Pesanan pengguna' : '—') }}</span>
                <span
                  v-if="row.original.notes"
                  class="text-[13px]/[18px] text-toned"
                >{{ row.original.notes }}</span>
              </div>
            </template>
            <template #actions-cell="{ row }">
              <div
                v-if="row.original.status === 'pending'"
                class="flex justify-end"
              >
                <UDropdownMenu
                  :items="pendingMenu(row.original)"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    icon="i-ctm-more-vertical"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Aksi pesanan ${row.original.code ?? ''}`"
                  />
                </UDropdownMenu>
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

      <UModal
        :open="!!confirming"
        title="Konfirmasi pembayaran"
        :description="confirming ? `${confirming.userName} · ${confirming.packageName} · ${formatRupiah(confirming.amount)} · ${confirming.code ?? ''}` : ''"
        @update:open="v => { if (!v) confirming = null }"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <p class="text-sm text-toned">
              Pastikan dana sudah masuk ke rekening. Paket langsung aktif: berakhir pada tanggal berakhir paket pengguna saat ini (atau hari ini) ditambah {{ confirming?.durationDays }} hari.
            </p>
            <UFormField
              label="Referensi pembayaran"
              hint="Opsional"
            >
              <UInput
                v-model="confirmRef"
                placeholder="Contoh: TRF BCA 0711"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              variant="ghost"
              @click="confirming = null"
            >
              Batal
            </UButton>
            <UButton
              icon="i-ctm-checkmark-circle"
              :loading="actionBusy"
              @click="confirmPaid"
            >
              Konfirmasi lunas
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
