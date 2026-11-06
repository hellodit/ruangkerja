<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TabsItem } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

useSeoMeta({ title: 'Detail RHK' })
const route = useRoute()
const notify = useNotify()
const id = computed(() => String(route.params.id))
const periodId = ref<string | undefined>(typeof route.query.periodId === 'string' ? route.query.periodId : undefined)

const { data, refresh, error } = await useFetch<InternalApi['/api/rhks/:id']['get']>(() => `/api/rhks/${id.value}`, { query: { periodId } })
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'RHK tidak ditemukan', fatal: true })
}

type Plan = NonNullable<typeof data.value>['plans'][number]

const filter = ref<'all' | 'open' | 'done'>('all')
const plans = computed(() => data.value?.plans ?? [])
const shown = computed(() => plans.value.filter(p => filter.value === 'all' || (filter.value === 'done' ? p.status === 'selesai' : p.status !== 'selesai')))
const tabs = computed<TabsItem[]>(() => [
  { label: 'Semua', value: 'all', badge: String(plans.value.length) },
  { label: 'Berjalan', value: 'open', badge: String(plans.value.filter(p => p.status !== 'selesai').length) },
  { label: 'Selesai', value: 'done', badge: String(plans.value.filter(p => p.status === 'selesai').length) }
])
const periodItems = computed(() => (data.value?.periods ?? []).map(p => ({ label: periodShortLabel(p), value: p.id })))
const selectedPeriod = computed({
  get: () => data.value?.period.id,
  set: (v) => {
    periodId.value = v
  }
})

const columns: TableColumn<Plan>[] = [
  { accessorKey: 'name', header: 'Rencana aksi' },
  { id: 'realization', header: 'Realisasi' },
  { accessorKey: 'progressCount', header: 'Progres' },
  { accessorKey: 'dueDate', header: 'Tenggat' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Aksi') }
]

const modalOpen = ref(false)
const editing = ref<Plan | null>(null)
const deleting = ref<Plan | null>(null)
const copying = ref(false)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}

async function setStatus(p: Plan, status: ActionPlanStatus) {
  try {
    await $fetch(`/api/action-plans/${p.id}`, { method: 'PUT', body: { status } })
    await refresh()
  } catch (err) {
    notify.error(err)
  }
}

function rowActions(p: Plan): DropdownMenuItem[][] {
  return [[
    { label: 'Tambah progres', icon: 'i-lucide-notebook-pen', to: `/progres/tambah?actionPlanId=${p.id}` },
    { label: 'Ubah', icon: 'i-lucide-pencil', onSelect: () => { editing.value = p; modalOpen.value = true } }
  ], [
    p.status === 'selesai'
      ? { label: 'Tandai berjalan', icon: 'i-lucide-rotate-ccw', onSelect: () => setStatus(p, 'berjalan') }
      : { label: 'Tandai selesai', icon: 'i-lucide-check', onSelect: () => setStatus(p, 'selesai') }
  ], [
    { label: 'Hapus', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => { deleting.value = p } }
  ]]
}

async function confirmDelete() {
  if (!deleting.value) {
    return
  }
  try {
    await $fetch(`/api/action-plans/${deleting.value.id}`, { method: 'DELETE' })
    notify.success('Rencana aksi dihapus')
    deleting.value = null
    await refresh()
  } catch (err) {
    notify.error(err)
  }
}

async function copyPrevious() {
  if (!data.value?.previousPeriod) {
    return
  }
  copying.value = true
  try {
    const res = await $fetch<{ created: number }>('/api/action-plans/copy', {
      method: 'POST',
      body: { rhkId: id.value, fromPeriodId: data.value.previousPeriod.id, toPeriodId: data.value.period.id }
    })
    notify.success(`${res.created} rencana aksi disalin dari ${data.value.previousPeriod.label}`)
    await refresh()
  } catch (err) {
    notify.error(err)
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="rhk-detail">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UButton to="/rhk" icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="Kembali ke RHK saya" />
        </template>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs text-muted">RHK saya</span>
            <h1 class="text-xl font-semibold text-highlighted">
              RHK {{ data?.rhk.number }}
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="data" class="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <UCard>
          <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <RhkTag :number="data.rhk.number" />
                  <UBadge color="neutral" variant="subtle" size="sm">
                    {{ RHK_TYPE_LABELS[data.rhk.type] }}
                  </UBadge>
                </div>
                <h2 class="text-xl font-semibold text-highlighted">
                  {{ data.rhk.statement }}
                </h2>
                <p v-if="data.rhk.supervisorRhk" class="text-sm text-muted">
                  Mendukung RHK atasan: {{ data.rhk.supervisorRhk }}
                </p>
              </div>
              <UButton :to="`/rhk/${id}/ubah`" color="neutral" variant="outline" size="sm" icon="i-lucide-pencil">
                Ubah RHK
              </UButton>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-md bg-muted p-4">
                <p class="text-sm text-muted">
                  Rencana aksi {{ data.period.label }}
                </p>
                <p class="text-2xl font-bold text-highlighted tabular-nums">
                  {{ data.stats.plans }} <span class="text-sm font-normal text-muted">· {{ data.stats.done }} selesai</span>
                </p>
              </div>
              <div class="rounded-md bg-muted p-4">
                <p class="text-sm text-muted">
                  Progres harian periode ini
                </p>
                <p class="text-2xl font-bold text-highlighted tabular-nums">
                  {{ data.stats.progress }} <span class="text-sm font-normal text-muted">catatan</span>
                </p>
              </div>
              <div class="rounded-md bg-muted p-4">
                <p class="text-sm text-muted">
                  Lewat tenggat
                </p>
                <p class="text-2xl font-bold tabular-nums" :class="data.stats.overdue ? 'text-error' : 'text-highlighted'">
                  {{ data.stats.overdue }} <span class="text-sm font-normal text-muted">rencana aksi</span>
                </p>
              </div>
              <div class="rounded-md bg-muted p-4">
                <p class="text-sm text-muted">
                  Progres tanpa bukti
                </p>
                <p class="text-2xl font-bold tabular-nums" :class="data.stats.missingEvidence ? 'text-warning' : 'text-highlighted'">
                  {{ data.stats.missingEvidence }} <span class="text-sm font-normal text-muted">catatan</span>
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div class="flex min-w-0 flex-col gap-6">
            <UCard :ui="{ body: 'p-0 sm:p-0' }">
              <template #header>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold text-highlighted">
                      Rencana aksi
                    </h2>
                    <div class="flex flex-wrap items-center gap-2">
                      <USelect v-model="selectedPeriod" :items="periodItems" icon="i-lucide-calendar" size="sm" class="w-52" aria-label="Pilih periode" />
                      <UButton
                        v-if="data.previousPeriod"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        icon="i-lucide-copy"
                        :loading="copying"
                        @click="copyPrevious"
                      >
                        Salin dari {{ data.previousPeriod.label }}
                      </UButton>
                      <UButton size="sm" icon="i-lucide-plus" @click="openAdd">
                        Tambah rencana aksi
                      </UButton>
                    </div>
                  </div>
                  <UTabs v-model="filter" :items="tabs" variant="link" :content="false" size="sm" aria-label="Filter status rencana aksi" />
                </div>
              </template>

              <UEmpty
                v-if="!shown.length"
                icon="i-lucide-list-ordered"
                :title="plans.length ? 'Tidak ada rencana aksi dengan status ini' : `Belum ada rencana aksi di ${data.period.label}`"
                description="Susun rencana aksi di awal periode untuk RHK ini."
                variant="naked"
                class="py-10"
              />
              <UTable v-else :data="shown" :columns="columns">
                <template #name-cell="{ row }">
                  <span class="block max-w-72 font-medium whitespace-normal text-highlighted">{{ row.original.name }}</span>
                </template>
                <template #realization-cell="{ row }">
                  <div class="flex w-36 flex-col gap-1.5">
                    <span class="text-xs text-muted tabular-nums">{{ formatNumber(row.original.realization) }} dari {{ formatNumber(row.original.target) }} {{ row.original.unit }}</span>
                    <UProgress :model-value="row.original.achievement" size="xs" :aria-label="`Realisasi ${row.original.name}`" />
                  </div>
                </template>
                <template #progressCount-cell="{ row }">
                  <ULink :to="`/progres?rhkId=${id}`" class="text-sm text-info whitespace-nowrap">
                    {{ row.original.progressCount }} catatan
                  </ULink>
                </template>
                <template #dueDate-cell="{ row }">
                  <span class="whitespace-nowrap" :class="row.original.overdue && 'font-medium text-error'">
                    {{ formatDayMonth(row.original.dueDate) }}<template v-if="row.original.overdue"> · lewat</template>
                  </span>
                </template>
                <template #status-cell="{ row }">
                  <PlanStatusBadge :status="row.original.status" />
                </template>
                <template #actions-cell="{ row }">
                  <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }">
                    <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" :aria-label="`Menu rencana aksi ${row.original.name}`" />
                  </UDropdownMenu>
                </template>
              </UTable>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-lg font-semibold text-highlighted">
                    Progres harian terbaru
                  </h2>
                  <ULink :to="`/progres?rhkId=${id}`" class="text-sm font-medium text-info">
                    Lihat semua progres RHK {{ data.rhk.number }}
                  </ULink>
                </div>
              </template>
              <p v-if="!data.recentProgress.length" class="text-sm text-muted">
                Belum ada progres harian untuk RHK ini di {{ data.period.label }}.
              </p>
              <ul v-else class="divide-y divide-default">
                <li v-for="p in data.recentProgress" :key="p.id" class="grid gap-1 py-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-4">
                  <span class="text-sm text-muted">{{ formatDateShort(p.workDate) }}</span>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs text-muted"><span class="font-mono">{{ formatTime(p.startTime) }}–{{ formatTime(p.endTime) }}</span> · {{ p.planName }}</span>
                    <NuxtLink :to="`/progres/${p.id}`" class="text-sm hover:underline">{{ p.description }}</NuxtLink>
                    <span v-if="!p.hasEvidence" class="flex items-center gap-1 text-xs text-warning"><UIcon name="i-lucide-triangle-alert" class="size-3.5" />Belum ada bukti</span>
                  </div>
                </li>
              </ul>
            </UCard>
          </div>

          <div class="flex min-w-0 flex-col gap-6">
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">
                  Indikator kinerja
                </h2>
              </template>
              <ul class="flex flex-col gap-4">
                <li v-for="ind in data.rhk.indicators" :key="ind.id" class="flex flex-col gap-0.5">
                  <span class="text-xs font-semibold text-muted">{{ ASPECT_LABELS[ind.aspect] }} · target {{ formatNumber(ind.target) }} {{ ind.unit }}</span>
                  <span class="text-sm text-highlighted">{{ ind.indicator }}</span>
                </li>
                <li v-if="!data.rhk.indicators.length" class="text-sm text-warning">
                  Belum ada indikator.
                </li>
              </ul>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-lg font-semibold text-highlighted">
                    Bukti dukung
                  </h2>
                  <ULink :to="`/bukti?rhkId=${id}`" class="text-sm font-medium text-info">
                    Lihat semua
                  </ULink>
                </div>
              </template>
              <ul class="flex flex-col gap-2">
                <li v-for="e in data.evidence" :key="e.id">
                  <ULink :to="e.url!" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm text-info">
                    <UIcon name="i-lucide-link" class="size-4 shrink-0" />
                    <span class="truncate">{{ e.name }}</span>
                  </ULink>
                </li>
                <li v-if="!data.evidence.length" class="text-sm text-muted">
                  Belum ada tautan bukti.
                </li>
              </ul>
              <p v-if="data.stats.missingEvidence" class="mt-3 flex items-center gap-1.5 text-sm text-warning">
                <UIcon name="i-lucide-triangle-alert" class="size-4" />{{ data.stats.missingEvidence }} progres harian belum punya bukti
              </p>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold text-highlighted">
                  Realisasi periode
                </h2>
              </template>
              <p class="text-sm text-muted">
                Draf realisasi {{ data.period.label }} untuk RHK ini disusun dari progres harian di atas. Batas pengisian {{ formatDate(data.period.submissionDeadline) }}.
              </p>
              <UButton :to="`/realisasi?periodId=${data.period.id}`" color="neutral" variant="ghost" size="sm" trailing-icon="i-lucide-chevron-right" class="mt-3 -ml-2.5">
                Lihat draf realisasi
              </UButton>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <ActionPlanModal v-if="data" v-model:open="modalOpen" :rhk-id="id" :period="data.period" :plan="editing" @saved="refresh" />

  <UModal :open="!!deleting" title="Hapus rencana aksi?" :description="deleting ? `“${deleting.name}” dan progres hariannya akan disembunyikan.` : ''" @update:open="v => { if (!v) deleting = null }">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="deleting = null">
          Batal
        </UButton>
        <UButton color="error" @click="confirmDelete">
          Hapus rencana aksi
        </UButton>
      </div>
    </template>
  </UModal>
</template>
