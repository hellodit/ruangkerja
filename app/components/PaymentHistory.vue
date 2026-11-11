<script setup lang="ts">
import type { InternalApi } from 'nitropack'

/**
 * The user's own payment history on /subscription: a list with status; a row
 * opens a dialog with the details. A pending order can be paid (while its
 * link is valid) or cancelled from the dialog.
 */
type Item = InternalApi['/api/subscription/history']['get'][number]

const props = defineProps<{ items: Item[], cancelling?: boolean }>()
const emit = defineEmits<{ cancel: [] }>()

const copy = useCopyText()
const TZ = 'Asia/Jakarta'

/** `short` fits the list on phones; `label` everywhere else. */
const STATUS: Record<Item['status'], { label: string, short: string, color: 'success' | 'warning' | 'error' | 'neutral' }> = {
  paid: { label: 'Lunas', short: 'Lunas', color: 'success' },
  pending: { label: 'Menunggu pembayaran', short: 'Menunggu', color: 'warning' },
  failed: { label: 'Gagal', short: 'Gagal', color: 'error' },
  refunded: { label: 'Dikembalikan', short: 'Dikembalikan', color: 'neutral' },
  cancelled: { label: 'Dibatalkan', short: 'Dibatalkan', color: 'neutral' }
}
const METHOD: Record<Item['method'], string> = { manual: 'Transfer bank', sumopay: 'SumoPay' }

const date = (ts: string | Date) => formatDate(todayInTimeZone(TZ, new Date(ts)))
function dateTime(ts: string | Date) {
  const d = new Date(ts)
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${date(d)}, ${time} WIB`
}
function methodLabel(i: Item) {
  return i.source === 'admin' ? 'Diberikan admin' : METHOD[i.method]
}

const selected = ref<Item | null>(null)
const open = computed({
  get: () => !!selected.value,
  set: (v) => {
    if (!v) selected.value = null
  }
})

/** Detail rows of the dialog; empty values are left out. */
const details = computed(() => {
  const i = selected.value
  if (!i) return []
  const rows: Array<{ label: string, value: string, copy?: string }> = [
    { label: 'Paket', value: `${i.packageName} · ${formatDurationDays(i.durationDays)}` },
    { label: 'Total', value: formatRupiah(i.amount) },
    { label: 'Metode', value: methodLabel(i) },
    { label: 'Dibuat', value: dateTime(i.createdAt) }
  ]
  if (i.code) rows.splice(0, 0, { label: 'Kode pesanan', value: i.code, copy: i.code })
  if (i.paidAt) rows.push({ label: 'Dibayar', value: dateTime(i.paidAt) })
  if (i.periodStart && i.periodEnd) rows.push({ label: 'Masa aktif', value: `${date(i.periodStart)} – ${date(i.periodEnd)}` })
  if (i.paymentExpiresAt && i.paymentUrl) rows.push({ label: 'Bayar sebelum', value: dateTime(i.paymentExpiresAt) })
  if (i.reason) rows.push({ label: 'Keterangan', value: i.reason })
  if (i.paymentId) rows.push({ label: 'ID pembayaran', value: i.paymentId, copy: i.paymentId })
  return rows
})

async function pay(url: string) {
  await navigateTo(url, { external: true })
}

// Close once the parent has cancelled the order (the list refreshes).
function cancel() {
  emit('cancel')
}
watch(() => props.cancelling, (now, before) => {
  if (before && !now) selected.value = null
})
</script>

<template>
  <section
    aria-labelledby="riwayat-pembayaran"
    class="flex flex-col gap-4"
  >
    <h2
      id="riwayat-pembayaran"
      class="text-lg/[26px] font-semibold text-highlighted"
    >
      Riwayat pembayaran
    </h2>

    <UCard
      v-if="!items.length"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <UEmpty
        icon="i-ctm-credit-cards"
        title="Belum ada pembayaran"
        description="Pesanan dan pembayaran paket Anda akan muncul di sini."
        variant="naked"
      />
    </UCard>

    <UCard
      v-else
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <ul class="divide-y divide-default">
        <li
          v-for="i in items"
          :key="i.id"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated/60 focus-visible:bg-elevated/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:px-6"
            :aria-label="`Detail pembayaran ${i.packageName}, ${date(i.createdAt)}, ${STATUS[i.status].label}`"
            @click="selected = i"
          >
            <!-- One row at every width: info grows, amount + status stack on phones. -->
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-medium text-highlighted">{{ i.packageName }} · {{ formatDurationDays(i.durationDays) }}</span>
              <span class="truncate text-sm text-toned">
                {{ date(i.createdAt) }} · {{ i.code ?? methodLabel(i) }}
              </span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
              <span class="font-semibold text-highlighted tabular-nums">{{ formatRupiah(i.amount) }}</span>
              <StatusChip :color="STATUS[i.status].color">
                <span class="sm:hidden">{{ STATUS[i.status].short }}</span>
                <span class="hidden sm:inline">{{ STATUS[i.status].label }}</span>
              </StatusChip>
            </span>
            <UIcon
              name="i-ctm-chevron-right"
              class="size-5 shrink-0 text-muted"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </UCard>

    <UModal
      v-model:open="open"
      title="Detail pembayaran"
      :description="selected ? `${selected.packageName} · ${formatRupiah(selected.amount)}` : ''"
      :ui="{ content: 'sm:max-w-[480px]' }"
    >
      <template #body>
        <div
          v-if="selected"
          class="flex flex-col gap-4"
        >
          <StatusChip
            :color="STATUS[selected.status].color"
            class="self-start"
          >
            {{ STATUS[selected.status].label }}
          </StatusChip>
          <dl class="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
            <template
              v-for="row in details"
              :key="row.label"
            >
              <dt class="text-toned">
                {{ row.label }}
              </dt>
              <dd class="flex min-w-0 items-start gap-1 font-medium text-highlighted">
                <span :class="row.copy ? 'font-mono break-all' : 'break-words'">{{ row.value }}</span>
                <UButton
                  v-if="row.copy"
                  variant="ghost"
                  size="xs"
                  icon="i-ctm-copy"
                  class="-my-1"
                  :aria-label="`Salin ${row.label.toLowerCase()}`"
                  @click="copy(row.copy, `${row.label} disalin`)"
                />
              </dd>
            </template>
          </dl>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UButton
            v-if="selected?.status === 'pending'"
            color="error"
            variant="ghost"
            class="me-auto"
            :loading="cancelling"
            @click="cancel"
          >
            Batalkan pesanan
          </UButton>
          <UButton
            variant="ghost"
            @click="open = false"
          >
            Tutup
          </UButton>
          <UButton
            v-if="selected?.paymentUrl"
            icon="i-ctm-credit-cards"
            @click="pay(selected.paymentUrl)"
          >
            Bayar sekarang
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>
