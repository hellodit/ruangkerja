<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

useSeoMeta({ title: 'Progres harian' })
type Entry = InternalApi['/api/progress']['get']['entries'][number]

const route = useRoute()
const router = useRouter()
const notify = useNotify()
const copy = useCopyText()
const { me } = useMe()
const UCheckbox = resolveComponent('UCheckbox')

const today = computed(() => me.value?.today ?? todayInTimeZone('Asia/Jakarta'))
const weekStart = ref(typeof route.query.minggu === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.minggu) ? weekRange(route.query.minggu).start : weekRange(today.value).start)
const rhkId = ref<string | undefined>(typeof route.query.rhkId === 'string' ? route.query.rhkId : undefined)
const noEvidence = ref(route.query.bukti === 'kosong')

// PRG-01: the last chosen view is remembered per user.
const { data: settings } = await useFetch('/api/settings', { key: 'settings' })
const view = ref<'list' | 'calendar'>(settings.value?.progressView ?? 'list')
const viewTabs: TabsItem[] = [
  { label: 'Daftar', value: 'list', icon: 'i-lucide-list' },
  { label: 'Kalender', value: 'calendar', icon: 'i-lucide-calendar' }
]
watch(view, v => $fetch('/api/settings', { method: 'PATCH', body: { progressView: v } }).catch(() => {}))

const { data: rhkList } = await useFetch('/api/rhks', { key: 'rhks' })
const rhkItems = computed(() => [{ label: 'Semua RHK', value: 'all' }, ...(rhkList.value?.rhks ?? []).map(r => ({ label: `RHK ${r.number}`, value: r.id }))])
const rhkFilter = computed({
  get: () => rhkId.value ?? 'all',
  set: (v: string) => {
    rhkId.value = v === 'all' ? undefined : v
  }
})

const weekEnd = computed(() => addDays(weekStart.value, 4))
const { data, refresh, status } = await useFetch('/api/progress', {
  query: computed(() => ({ from: weekStart.value, to: weekEnd.value, rhkId: rhkId.value })),
  key: 'progress-list'
})
watch([weekStart, rhkId, noEvidence], () => {
  router.replace({ query: { minggu: weekStart.value, ...(rhkId.value ? { rhkId: rhkId.value } : {}), ...(noEvidence.value ? { bukti: 'kosong' } : {}) } })
})

const entries = computed(() => data.value?.entries ?? [])
const missingCount = computed(() => entries.value.filter(e => !e.hasEvidence).length)
const shown = computed(() => (noEvidence.value ? entries.value.filter(e => !e.hasEvidence) : entries.value))
const totalMinutes = computed(() => shown.value.reduce((n, e) => n + minutesBetween(e.startTime, e.endTime), 0))

function toggleRow(id: string, selected: boolean) {
  rowSelection.value = { ...rowSelection.value, [id]: selected }
}

function shiftWeek(delta: number) {
  weekStart.value = addDays(weekStart.value, delta * 7)
}

// --- selection + copy (PRG-02 / PRG-09) -----------------------------------
const rowSelection = ref<Record<string, boolean>>({})
const selectedIds = computed(() => Object.keys(rowSelection.value).filter(k => rowSelection.value[k]))
watch([weekStart, rhkId, noEvidence], () => {
  rowSelection.value = {}
})

async function copyEntries(ids: string[]) {
  try {
    const res = await $fetch<{ text: string, count: number }>('/api/progress/copy', { method: 'POST', body: { ids } })
    await copy(res.text, `${res.count} catatan disalin untuk e-Kinerja`)
  } catch (err) {
    notify.error(err)
  }
}

const columns: TableColumn<Entry>[] = [
  {
    id: 'select',
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v),
      'aria-label': 'Pilih semua catatan'
    }),
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
      'aria-label': `Pilih catatan ${formatDateShort(row.original.workDate)} ${formatTime(row.original.startTime)}`
    })
  },
  { accessorKey: 'workDate', header: 'Tanggal' },
  { id: 'time', header: 'Jam' },
  { id: 'plan', header: 'Rencana aksi' },
  { accessorKey: 'description', header: 'Uraian' },
  { accessorKey: 'realization', header: 'Realisasi' },
  { id: 'evidence', header: 'Bukti' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Aksi') }
]

// --- calendar dialog ------------------------------------------------------
const detailOpen = ref(false)
const selected = ref<Entry | null>(null)
const evidenceOpen = ref(false)
const evidenceFor = ref<string>()
function openDetail(e: Entry) {
  selected.value = e
  detailOpen.value = true
}
function addEvidence(id: string) {
  detailOpen.value = false
  evidenceFor.value = id
  evidenceOpen.value = true
}
</script>

<template>
  <UDashboardPanel id="progres">
    <template #header>
      <UDashboardNavbar title="Progres harian">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UTabs
            v-model="view"
            :items="viewTabs"
            :content="false"
            size="sm"
            class="w-auto"
            aria-label="Tampilan progres harian"
          />
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              aria-label="Minggu sebelumnya"
              @click="shiftWeek(-1)"
            />
            <span class="min-w-36 text-center text-sm font-medium text-highlighted">{{ formatRange(weekStart, weekEnd) }}</span>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              aria-label="Minggu berikutnya"
              @click="shiftWeek(1)"
            />
            <UButton
              v-if="weekStart !== weekRange(today).start"
              color="neutral"
              variant="outline"
              size="sm"
              @click="weekStart = weekRange(today).start"
            >
              Minggu ini
            </UButton>
          </div>
          <USelect
            v-model="rhkFilter"
            :items="rhkItems"
            size="sm"
            class="w-36"
            aria-label="Saring menurut RHK"
          />
          <UButton
            :color="noEvidence ? 'warning' : 'neutral'"
            :variant="noEvidence ? 'soft' : 'outline'"
            size="sm"
            icon="i-lucide-triangle-alert"
            :aria-pressed="noEvidence"
            @click="noEvidence = !noEvidence"
          >
            Belum ada bukti · {{ missingCount }}
          </UButton>
        </template>
        <template #right>
          <span class="hidden text-sm text-muted md:inline">{{ shown.length }} catatan · {{ formatDuration(totalMinutes) }}</span>
          <UButton
            to="/progres/tambah"
            icon="i-lucide-plus"
          >
            Tambah progres
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <StartFromRhk v-if="me && !me.rhkCount" />
      <div
        v-else
        class="flex flex-col gap-4"
      >
        <div
          v-if="view === 'list' && selectedIds.length"
          role="status"
          class="flex flex-wrap items-center gap-3 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 dark:border-brand-800 dark:bg-brand-950/40"
        >
          <span class="flex-1 text-sm font-medium text-highlighted">{{ selectedIds.length }} catatan dipilih</span>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="rowSelection = {}"
          >
            Batal pilih
          </UButton>
          <UButton
            size="sm"
            icon="i-lucide-copy"
            @click="copyEntries(selectedIds)"
          >
            Salin untuk e-Kinerja
          </UButton>
        </div>

        <ul
          v-if="view === 'list'"
          class="flex flex-col gap-3 min-[740px]:hidden"
          aria-label="Daftar progres harian"
        >
          <li v-if="!shown.length">
            <UEmpty
              icon="i-lucide-notebook-pen"
              title="Belum ada catatan minggu ini"
              description="Catat pekerjaan hari ini dalam beberapa kalimat."
              :actions="[{ label: 'Tambah progres', to: '/progres/tambah', icon: 'i-lucide-plus' }]"
            />
          </li>
          <li
            v-for="e in shown"
            :key="e.id"
          >
            <UCard :ui="{ body: 'p-4 sm:p-4' }">
              <div class="flex items-start gap-3">
                <UCheckbox
                  :model-value="!!rowSelection[e.id]"
                  :aria-label="`Pilih catatan ${formatDateShort(e.workDate)} ${formatTime(e.startTime)}`"
                  class="mt-0.5"
                  @update:model-value="(v: boolean | 'indeterminate') => toggleRow(e.id, !!v)"
                />
                <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{{ formatDateShort(e.workDate) }}</span>
                    <span class="font-mono">{{ formatTime(e.startTime) }}–{{ formatTime(e.endTime) }}</span>
                    <RhkTag :number="e.rhk.number" />
                  </div>
                  <span class="text-sm font-semibold text-highlighted">{{ e.plan.name }}</span>
                  <p class="text-sm">
                    {{ e.description }}
                  </p>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span class="text-muted">Realisasi {{ formatNumber(e.realization) }} {{ e.realization ? e.plan.unit : '' }}</span>
                    <span
                      v-if="e.hasEvidence"
                      class="flex items-center gap-1 text-info"
                    ><UIcon
                      name="i-lucide-link"
                      class="size-3.5"
                    />{{ e.results.filter(r => r.evidenceUrl).length }} bukti</span>
                    <UButton
                      v-else
                      color="warning"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-triangle-alert"
                      class="-my-1"
                      @click="addEvidence(e.id)"
                    >
                      Belum ada bukti
                    </UButton>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <UButton
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Salin catatan ${formatDateShort(e.workDate)} ${formatTime(e.startTime)}`"
                    @click="copyEntries([e.id])"
                  />
                  <UButton
                    :to="`/progres/${e.id}`"
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Ubah catatan ${formatDateShort(e.workDate)} ${formatTime(e.startTime)}`"
                  />
                </div>
              </div>
            </UCard>
          </li>
        </ul>

        <UCard
          v-if="view === 'list'"
          class="max-[739px]:hidden"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <UTable
            v-model:row-selection="rowSelection"
            :data="shown"
            :columns="columns"
            :get-row-id="(row: Entry) => row.id"
            :loading="status === 'pending'"
            :ui="{ td: 'align-top' }"
          >
            <template #empty>
              <UEmpty
                icon="i-lucide-notebook-pen"
                title="Belum ada catatan minggu ini"
                description="Catat pekerjaan hari ini dalam beberapa kalimat."
                :actions="[{ label: 'Tambah progres', to: '/progres/tambah', icon: 'i-lucide-plus' }]"
                variant="naked"
              />
            </template>
            <template #workDate-cell="{ row }">
              <span class="whitespace-nowrap">{{ formatDateShort(row.original.workDate) }}</span>
            </template>
            <template #time-cell="{ row }">
              <span class="font-mono text-xs whitespace-nowrap">{{ formatTime(row.original.startTime) }}–{{ formatTime(row.original.endTime) }}</span>
            </template>
            <template #plan-cell="{ row }">
              <div class="flex max-w-56 flex-col items-start gap-1">
                <RhkTag :number="row.original.rhk.number" />
                <span class="text-sm whitespace-normal text-highlighted">{{ row.original.plan.name }}</span>
              </div>
            </template>
            <template #description-cell="{ row }">
              <p class="max-w-80 text-sm whitespace-normal">
                {{ row.original.description }}
              </p>
            </template>
            <template #realization-cell="{ row }">
              <span class="whitespace-nowrap tabular-nums">{{ formatNumber(row.original.realization) }} {{ row.original.realization ? row.original.plan.unit : '' }}</span>
            </template>
            <template #evidence-cell="{ row }">
              <ULink
                v-if="row.original.hasEvidence"
                :to="`/bukti?rhkId=${row.original.rhk.id}`"
                class="flex items-center gap-1 text-sm whitespace-nowrap text-info"
              >
                <UIcon
                  name="i-lucide-link"
                  class="size-4"
                />{{ row.original.results.filter(r => r.evidenceUrl).length }} bukti
              </ULink>
              <UButton
                v-else
                color="warning"
                variant="ghost"
                size="xs"
                icon="i-lucide-triangle-alert"
                @click="addEvidence(row.original.id)"
              >
                Belum ada
              </UButton>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UTooltip text="Salin untuk e-Kinerja">
                  <UButton
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Salin catatan ${formatDateShort(row.original.workDate)} ${formatTime(row.original.startTime)}`"
                    @click="copyEntries([row.original.id])"
                  />
                </UTooltip>
                <UTooltip text="Ubah">
                  <UButton
                    :to="`/progres/${row.original.id}`"
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Ubah catatan ${formatDateShort(row.original.workDate)} ${formatTime(row.original.startTime)}`"
                  />
                </UTooltip>
              </div>
            </template>
          </UTable>
        </UCard>

        <template v-else>
          <ProgressCalendar
            :entries="shown"
            :start="weekStart"
            :today="today"
            :timezone="me?.user.timezone"
            @select="openDetail"
          />
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span class="flex items-center gap-1.5"><UIcon
              name="i-lucide-info"
              class="size-4"
            />Klik catatan untuk melihat detailnya. Klik slot kosong untuk menambah progres pada jam itu.</span>
            <span>{{ shown.length }} catatan · {{ formatDuration(totalMinutes) }}<template v-if="missingCount"> · <span class="text-warning">{{ missingCount }} belum ada bukti</span></template></span>
          </div>
        </template>
      </div>
      <ProgressDetailModal
        v-model:open="detailOpen"
        :entry="selected"
        @add-evidence="addEvidence"
      />
      <EvidenceModal
        v-model:open="evidenceOpen"
        :progress-id="evidenceFor"
        @saved="refresh"
      />
    </template>
  </UDashboardPanel>
</template>
