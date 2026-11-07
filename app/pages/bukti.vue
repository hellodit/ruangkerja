<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

useSeoMeta({ title: 'Bukti dukung' })
type Item = InternalApi['/api/evidence']['get']['items'][number]

const route = useRoute()
const notify = useNotify()
const copy = useCopyText()
const { me } = useMe()

const q = ref('')
const qDebounced = refDebounced(q, 300)
const rhkId = ref<string | undefined>(typeof route.query.rhkId === 'string' ? route.query.rhkId : undefined)
const { data, refresh, status } = await useFetch('/api/evidence', { query: computed(() => ({ q: qDebounced.value || undefined, rhkId: rhkId.value })), key: 'evidence' })
const { data: rhkList } = await useFetch('/api/rhks', { key: 'rhks' })

const items = computed(() => data.value?.items ?? [])
const missing = computed(() => data.value?.missing ?? [])
const rhkChips = computed(() => [{ id: undefined as string | undefined, label: 'Semua RHK' }, ...(rhkList.value?.rhks ?? []).map(r => ({ id: r.id as string | undefined, label: `RHK ${r.number}` }))])

const columns: TableColumn<Item>[] = [
  { accessorKey: 'name', header: 'Dokumen' },
  { accessorKey: 'planName', header: 'Rencana aksi' },
  { accessorKey: 'workDate', header: 'Tanggal' },
  { accessorKey: 'url', header: 'Tautan' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Aksi') }
]

const evidenceOpen = ref(false)
const evidenceFor = ref<string>()
function addFor(id?: string) {
  evidenceFor.value = id
  evidenceOpen.value = true
}
const { data: weekProgress } = await useFetch('/api/progress', {
  query: computed(() => (data.value?.period ? { from: data.value.period.startDate, to: data.value.period.endDate } : {})),
  key: 'evidence-progress-options'
})
const progressOptions = computed(() => (weekProgress.value?.entries ?? []).map(e => ({
  label: `${formatDateShort(e.workDate)} · ${e.plan.name} — ${e.description.slice(0, 60)}`,
  value: e.id
})))

const editing = ref<Item | null>(null)
const editState = reactive({ name: '', evidenceUrl: '' })
function startEdit(item: Item) {
  editing.value = item
  Object.assign(editState, { name: item.name, evidenceUrl: item.url })
}
async function saveEdit() {
  if (!editing.value) {
    return
  }
  try {
    await $fetch(`/api/evidence/${editing.value.id}`, { method: 'PUT', body: editState })
    notify.success('Bukti diperbarui')
    editing.value = null
    await refresh()
  } catch (err) {
    notify.error(err)
  }
}
async function removeLink(item: Item) {
  try {
    await $fetch(`/api/evidence/${item.id}`, { method: 'DELETE' })
    notify.success('Tautan bukti dihapus')
    await Promise.all([refresh(), useMe().refresh()])
  } catch (err) {
    notify.error(err)
  }
}
function evidenceMenu(item: Item): DropdownMenuItem[][] {
  return [
    [{ label: 'Ubah', icon: 'i-ctm-edit', onSelect: () => startEdit(item) }, { label: 'Buka progres', icon: 'i-ctm-notes', to: `/progres/${item.progressId}` }],
    [{ label: 'Hapus tautan', icon: 'i-ctm-delete', color: 'error', onSelect: () => removeLink(item) }]
  ]
}

function host(url: string) {
  try {
    return `${new URL(url).hostname}/…`
  } catch {
    return url
  }
}
</script>

<template>
  <UDashboardPanel id="bukti">
    <template #header>
      <UDashboardNavbar title="Bukti dukung" />
    </template>

    <template #body>
      <StartFromRhk v-if="me && !me.rhkCount" />
      <div
        v-else
        class="flex w-full max-w-[1200px] flex-col gap-6"
      >
        <UAlert
          color="info"
          variant="subtle"
          icon="i-ctm-information"
          description="Bukti disimpan sebagai nama dokumen dan tautan. File tetap di Google Drive atau penyimpanan instansi, dan tautannya perlu bisa dibuka atasan. Jangan menautkan dokumen rahasia atau data pribadi warga."
        />

        <UCard v-if="missing.length">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Progres yang belum punya bukti
                </h2>
                <p
                  v-if="data?.period"
                  class="text-sm text-toned"
                >
                  Lengkapi sebelum batas pengisian {{ formatDate(data.period.submissionDeadline) }}.
                </p>
              </div>
              <StatusChip color="warning">
                {{ missing.length }} progres
              </StatusChip>
            </div>
          </template>
          <ul class="divide-y divide-default border-t border-default">
            <li
              v-for="m in missing"
              :key="m.id"
              class="flex flex-wrap items-center gap-3 py-5"
            >
              <div class="min-w-60 flex-1">
                <p class="text-sm text-highlighted">
                  {{ m.description }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDayMonth(m.workDate) }} · RHK {{ m.rhk.number }} · {{ m.planName }}
                </p>
              </div>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-ctm-link"
                @click="addFor(m.id)"
              >
                Tambah tautan
              </UButton>
            </li>
          </ul>
        </UCard>

        <UCard :ui="{ body: 'flex flex-col gap-4' }">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <UInput
              v-model="q"
              icon="i-ctm-search"
              placeholder="Cari nama dokumen atau rencana aksi"
              class="w-full sm:w-100"
              aria-label="Cari bukti"
            />
            <div
              role="group"
              aria-label="Filter RHK"
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
                {{ c.label }}
              </UButton>
            </div>
            <UButton
              icon="i-ctm-plus"
              size="lg"
              class="ml-auto"
              @click="addFor()"
            >
              Tambah bukti
            </UButton>
          </div>
          <ul
            class="flex flex-col gap-3 min-[740px]:hidden"
            aria-label="Daftar bukti dukung"
          >
            <li v-if="!items.length">
              <UEmpty
                icon="i-ctm-link"
                title="Belum ada bukti dukung"
                description="Tambahkan tautan bukti dari form progres harian atau tombol Tambah bukti."
              />
            </li>
            <li
              v-for="item in items"
              :key="item.id"
            >
              <UCard :ui="{ body: 'p-4 sm:p-4' }">
                <div class="flex items-start gap-3">
                  <UIcon
                    name="i-ctm-files-01"
                    class="mt-0.5 size-5 shrink-0 text-muted"
                  />
                  <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <span class="text-sm font-semibold text-highlighted">{{ item.name }}</span>
                    <span class="text-xs text-muted">{{ formatDayMonth(item.workDate) }} · RHK {{ item.rhk.number }} · {{ item.planName }}</span>
                    <ULink
                      :to="item.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="truncate text-sm text-info"
                    >
                      {{ host(item.url) }}
                    </ULink>
                  </div>
                  <UButton
                    icon="i-ctm-copy"
                    variant="ghost"
                    size="sm"
                    aria-label="Salin tautan"
                    @click="copy(item.url, 'Tautan disalin')"
                  />
                  <UDropdownMenu
                    :items="evidenceMenu(item)"
                    :content="{ align: 'end' }"
                  >
                    <UButton
                      icon="i-ctm-more-vertical"
                      variant="ghost"
                      size="sm"
                      aria-label="Menu bukti"
                    />
                  </UDropdownMenu>
                </div>
              </UCard>
            </li>
          </ul>
          <UTable
            class="rounded-md border border-default max-[739px]:hidden"
            :data="items"
            :columns="columns"
            :loading="status === 'pending'"
          >
            <template #empty>
              <UEmpty
                icon="i-ctm-link"
                title="Belum ada bukti dukung"
                description="Tambahkan tautan bukti dari form progres harian atau tombol Tambah bukti."
                variant="naked"
              />
            </template>
            <template #name-cell="{ row }">
              <div class="flex max-w-80 items-center gap-2.5">
                <UIcon
                  name="i-ctm-files-01"
                  class="size-5 shrink-0 text-toned"
                />
                <span class="text-sm font-semibold text-highlighted">{{ row.original.name }}</span>
              </div>
            </template>
            <template #planName-cell="{ row }">
              <div class="flex max-w-80 flex-col gap-0.5">
                <span class="text-sm text-highlighted">{{ row.original.planName }}</span>
                <span class="text-xs text-muted">RHK {{ row.original.rhk.number }}</span>
              </div>
            </template>
            <template #workDate-cell="{ row }">
              <span class="whitespace-nowrap">{{ formatDayMonth(row.original.workDate) }}</span>
            </template>
            <template #url-cell="{ row }">
              <ULink
                :to="row.original.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
              >
                {{ host(row.original.url) }}
              </ULink>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UTooltip text="Salin tautan">
                  <UButton
                    icon="i-ctm-copy"
                    variant="ghost"
                    size="sm"
                    aria-label="Salin tautan"
                    @click="copy(row.original.url, 'Tautan disalin')"
                  />
                </UTooltip>
                <UDropdownMenu
                  :items="[[{ label: 'Ubah', icon: 'i-ctm-edit', onSelect: () => startEdit(row.original) }, { label: 'Buka progres', icon: 'i-ctm-notes', to: `/progres/${row.original.progressId}` }], [{ label: 'Hapus tautan', icon: 'i-ctm-delete', color: 'error', onSelect: () => removeLink(row.original) }]]"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    icon="i-ctm-more-vertical"
                    variant="ghost"
                    size="sm"
                    aria-label="Menu bukti"
                  />
                </UDropdownMenu>
              </div>
            </template>
          </UTable>
          <p class="text-sm text-toned">
            Menampilkan {{ items.length }} bukti dukung
          </p>
        </UCard>
      </div>
      <EvidenceModal
        v-model:open="evidenceOpen"
        :progress-id="evidenceFor"
        :options="progressOptions"
        @saved="refresh"
      />

      <UModal
        :open="!!editing"
        title="Ubah bukti"
        @update:open="v => { if (!v) editing = null }"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <UFormField
              label="Nama dokumen"
              required
            >
              <UInput v-model="editState.name" />
            </UFormField>
            <UFormField
              label="Tautan bukti"
              required
            >
              <UInput
                v-model="editState.evidenceUrl"
                inputmode="url"
                icon="i-ctm-link"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              variant="ghost"
              @click="editing = null"
            >
              Batal
            </UButton>
            <UButton @click="saveEdit">
              Simpan
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
