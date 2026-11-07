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
  { label: 'Daftar', value: 'list', icon: 'i-ctm-list-bullet' },
  { label: 'Kalender', value: 'calendar', icon: 'i-ctm-date' }
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
const isCurrentWeek = computed(() => weekStart.value >= weekRange(today.value).start)
const rhkChips = computed(() => [
  { id: undefined as string | undefined, label: 'Semua RHK', number: 0 },
  ...(rhkList.value?.rhks ?? []).map(r => ({ id: r.id as string | undefined, label: `RHK ${r.number}`, number: r.number }))
])
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
      <UDashboardNavbar title="Progres harian" />
    </template>

    <template #body>
      <StartFromRhk v-if="me && !me.rhkCount" />
      <div
        v-else
        class="flex w-full max-w-[1200px] flex-col gap-4"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <UTabs
            v-model="view"
            :items="viewTabs"
            :content="false"
            class="w-auto"
            aria-label="Tampilan progres harian"
          />
          <div class="flex items-center gap-1">
            <UButton
              v-if="view === 'calendar' || !isCurrentWeek"
              color="neutral"
              variant="outline"
              size="sm"
              class="mr-1"
              @click="weekStart = weekRange(today).start"
            >
              Minggu ini
            </UButton>
            <UButton
              icon="i-ctm-chevron-left"
              variant="ghost"
              aria-label="Minggu sebelumnya"
              @click="shiftWeek(-1)"
            />
            <UButton
              v-if="view === 'calendar'"
              icon="i-ctm-chevron-right"
              variant="ghost"
              aria-label="Minggu berikutnya"
              @click="shiftWeek(1)"
            />
            <span
              class="text-base/6 font-semibold text-highlighted"
              :class="view === 'calendar' ? 'px-1' : 'min-w-40 text-center'"
            >{{ formatRange(weekStart, weekEnd) }}</span>
            <UButton
              v-if="view === 'list'"
              icon="i-ctm-chevron-right"
              variant="ghost"
              aria-label="Minggu berikutnya"
              @click="shiftWeek(1)"
            />
          </div>
          <div
            v-if="view === 'calendar'"
            role="group"
            aria-label="Saring menurut RHK"
            class="flex flex-wrap gap-2"
          >
            <UButton
              v-for="c in rhkChips"
              :key="c.label"
              color="neutral"
              variant="outline"
              class="h-[30px] rounded-full px-3 text-sm/5 font-normal ring-default"
              :class="rhkId === c.id && 'bg-brand-100 text-brand-ink ring-brand-700 hover:bg-brand-100 dark:bg-brand-950/50'"
              :aria-pressed="rhkId === c.id"
              @click="rhkId = c.id"
            >
              <span
                v-if="c.number"
                class="size-2.5 rounded-[3px] border"
                :class="rhkColor(c.number).swatch"
                aria-hidden="true"
              />
              {{ c.label }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-ctm-warning"
              :aria-pressed="noEvidence"
              class="h-[30px] rounded-full px-3 text-sm/5 font-normal ring-default"
              :class="noEvidence && 'bg-brand-100 text-brand-ink ring-brand-700 hover:bg-brand-100 dark:bg-brand-950/50'"
              :ui="{ leadingIcon: 'size-4 text-warning' }"
              @click="noEvidence = !noEvidence"
            >
              Belum ada bukti · {{ missingCount }}
            </UButton>
          </div>
          <template v-else>
            <USelect
              v-model="rhkFilter"
              :items="rhkItems"
              class="w-50"
              aria-label="Saring menurut RHK"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-ctm-warning"
              :aria-pressed="noEvidence"
              class="h-[30px] rounded-full px-3 text-sm/5 font-normal ring-default"
              :class="noEvidence && 'bg-brand-100 text-brand-ink ring-brand-700 hover:bg-brand-100 dark:bg-brand-950/50'"
              :ui="{ leadingIcon: 'size-4 text-warning' }"
              @click="noEvidence = !noEvidence"
            >
              Belum ada bukti · {{ missingCount }}
            </UButton>
          </template>
          <span
            v-if="view === 'list'"
            class="ml-auto hidden text-sm text-toned md:inline"
          >{{ shown.length }} catatan · {{ formatDuration(totalMinutes) }}</span>
          <UButton
            to="/progres/tambah"
            :class="view === 'calendar' && 'ml-auto'"
            icon="i-ctm-plus"
          >
            Tambah progres
          </UButton>
        </div>

        <div
          v-if="view === 'list' && selectedIds.length"
          role="status"
          class="flex flex-wrap items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-800 dark:bg-brand-950/40"
        >
          <span class="flex-1 text-sm font-semibold text-highlighted">{{ selectedIds.length }} catatan dipilih</span>
          <UButton
            variant="ghost"
            size="sm"
            @click="rowSelection = {}"
          >
            Batal pilih
          </UButton>
          <UButton
            size="sm"
            icon="i-ctm-copy"
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
              icon="i-ctm-notes"
              title="Belum ada catatan minggu ini"
              description="Catat pekerjaan hari ini dalam beberapa kalimat."
              :actions="[{ label: 'Tambah progres', to: '/progres/tambah', icon: 'i-ctm-plus' }]"
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
                      name="i-ctm-link"
                      class="size-3.5"
                    />{{ e.results.filter(r => r.evidenceUrl).length }} bukti</span>
                    <UButton
                      v-else
                      color="warning"
                      variant="ghost"
                      size="xs"
                      icon="i-ctm-warning"
                      class="-my-1"
                      @click="addEvidence(e.id)"
                    >
                      Belum ada bukti
                    </UButton>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <UButton
                    icon="i-ctm-copy"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Salin catatan ${formatDateShort(e.workDate)} ${formatTime(e.startTime)}`"
                    @click="copyEntries([e.id])"
                  />
                  <UButton
                    :to="`/progres/${e.id}`"
                    icon="i-ctm-edit"
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
          >
            <template #empty>
              <UEmpty
                icon="i-ctm-notes"
                title="Belum ada catatan minggu ini"
                description="Catat pekerjaan hari ini dalam beberapa kalimat."
                :actions="[{ label: 'Tambah progres', to: '/progres/tambah', icon: 'i-ctm-plus' }]"
                variant="naked"
              />
            </template>
            <template #workDate-cell="{ row }">
              <span class="font-semibold whitespace-nowrap">{{ formatDateShort(row.original.workDate) }}</span>
            </template>
            <template #time-cell="{ row }">
              <span class="font-mono text-[13px] whitespace-nowrap">{{ formatTime(row.original.startTime) }}–{{ formatTime(row.original.endTime) }}</span>
            </template>
            <template #plan-cell="{ row }">
              <div class="flex max-w-56 flex-col items-start gap-1">
                <RhkTag :number="row.original.rhk.number" />
                <span class="text-sm text-highlighted">{{ row.original.plan.name }}</span>
              </div>
            </template>
            <template #description-cell="{ row }">
              <p class="max-w-80 text-[13px]/[18px] text-toned">
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
                class="flex items-center gap-1 text-[13px] whitespace-nowrap text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <UIcon
                  name="i-ctm-link"
                  class="size-4"
                /><span class="underline underline-offset-2">{{ row.original.results.filter(r => r.evidenceUrl).length }} bukti</span>
              </ULink>
              <UButton
                v-else
                color="warning"
                variant="link"
                icon="i-ctm-warning"
                class="gap-1 text-[13px]/5 whitespace-nowrap no-underline"
                :ui="{ leadingIcon: 'size-4' }"
                @click="addEvidence(row.original.id)"
              >
                Belum ada
              </UButton>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UTooltip text="Salin untuk e-Kinerja">
                  <UButton
                    icon="i-ctm-copy"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Salin catatan ${formatDateShort(row.original.workDate)} ${formatTime(row.original.startTime)}`"
                    @click="copyEntries([row.original.id])"
                  />
                </UTooltip>
                <UTooltip text="Ubah">
                  <UButton
                    :to="`/progres/${row.original.id}`"
                    icon="i-ctm-edit"
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
