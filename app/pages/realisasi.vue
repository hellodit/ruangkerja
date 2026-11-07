<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

useSeoMeta({ title: 'Realisasi periode' })
type Rhk = InternalApi['/api/realizations']['get']['rhks'][number]
type PlanRow = Rhk['plans'][number]

const route = useRoute()
const openSources = ref<Record<string, boolean>>({})
const notify = useNotify()
const copy = useCopyText()
const { me } = useMe()
const periodId = ref<string | undefined>(typeof route.query.periodId === 'string' ? route.query.periodId : undefined)
const { data, refresh } = await useFetch('/api/realizations', { query: { periodId }, key: 'realizations' })

const periodItems = computed(() => (data.value?.periods ?? []).map(p => ({ label: periodShortLabel(p), value: p.id })))
const selectedPeriod = computed({
  get: () => data.value?.period.id,
  set: (v) => {
    periodId.value = v
  }
})
const columns: TableColumn<PlanRow>[] = [
  { accessorKey: 'name', header: 'Rencana aksi' },
  { accessorKey: 'target', header: 'Target' },
  { accessorKey: 'realization', header: 'Realisasi' },
  { accessorKey: 'evidence', header: 'Bukti' },
  { accessorKey: 'status', header: 'Status' }
]

async function copyRealization(rhkId?: string) {
  if (!data.value) {
    return
  }
  try {
    const res = await $fetch<{ text: string }>('/api/realizations/copy', { method: 'POST', body: { periodId: data.value.period.id, rhkId } })
    await copy(res.text, rhkId ? 'Realisasi disalin' : 'Semua realisasi disalin')
    await refresh()
  } catch (err) {
    notify.error(err)
  }
}

// Edit the narrative (final_text); the draft stays as the source-based reference.
const editing = ref<Rhk | null>(null)
const editText = ref('')
function startEdit(r: Rhk) {
  editing.value = r
  editText.value = r.finalText ?? r.draftText
}
async function saveEdit(reset = false) {
  if (!editing.value) {
    return
  }
  try {
    await $fetch(`/api/realizations/${editing.value.id}`, { method: 'PUT', body: { finalText: reset ? null : editText.value } })
    notify.success(reset ? 'Kembali ke draf dari progres harian' : 'Narasi realisasi disimpan')
    editing.value = null
    await refresh()
  } catch (err) {
    notify.error(err)
  }
}

const exportUrl = computed(() => (data.value ? `/api/realizations/export?periodId=${data.value.period.id}` : '#'))
</script>

<template>
  <UDashboardPanel id="realisasi">
    <template #header>
      <UDashboardNavbar title="Realisasi periode" />
    </template>

    <template #body>
      <StartFromRhk v-if="me && !me.rhkCount" />
      <div
        v-else-if="data"
        class="flex w-full max-w-[1200px] flex-col gap-6"
      >
        <div class="flex flex-wrap items-center gap-3">
          <USelect
            v-model="selectedPeriod"
            :items="periodItems"
            icon="i-ctm-date"
            class="w-auto min-w-56"
            :ui="{ base: 'h-9 rounded-sm px-4 gap-2 text-sm/5 font-semibold text-highlighted' }"
            aria-label="Pilih periode"
          />
          <UButton
            :to="exportUrl"
            external
            download
            color="neutral"
            variant="outline"
            icon="i-ctm-upload"
            class="ml-auto"
          >
            Unduh Word
          </UButton>
          <UButton
            icon="i-ctm-copy"
            @click="copyRealization()"
          >
            Salin semua realisasi
          </UButton>
        </div>
        <UAlert
          :color="data.daysToDeadline <= 3 ? 'error' : 'warning'"
          variant="subtle"
          icon="i-ctm-clock"
          :ui="{ description: 'text-xs/4' }"
          :title="`Batas pengisian ${data.period.label}: ${formatDateLong(data.period.submissionDeadline)} · ${data.daysToDeadline >= 0 ? `${data.daysToDeadline} hari lagi` : `lewat ${-data.daysToDeadline} hari`}`"
          description="Isi realisasi dan tautan bukti dukung di e-Kinerja sebelum tanggal ini. Setelah itu atasan melakukan evaluasi periode."
        />
        <div class="flex flex-wrap gap-2">
          <UBadge
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ data.totals.plans }} rencana aksi · {{ data.totals.done }} selesai
          </UBadge>
          <UBadge
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ data.totals.progress }} progres harian
          </UBadge>
          <UBadge
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ data.totals.evidence }} bukti dukung
          </UBadge>
        </div>

        <UCard
          v-for="r in data.rhks"
          :key="r.id"
        >
          <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="shrink-0"
                >
                  RHK {{ r.rhk.number }}
                </UBadge>
                <div class="flex min-w-0 flex-col gap-0.5">
                  <h2 class="text-[17px]/7 font-semibold text-highlighted">
                    {{ r.rhk.statement }}
                  </h2>
                  <p
                    v-if="r.indicator"
                    class="text-xs/[18px] text-muted"
                  >
                    IKI: {{ r.indicator.indicator }} · Target tahunan {{ formatNumber(r.indicator.target) }} {{ r.indicator.unit }}
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                <UButton
                  v-if="r.draftText || r.finalText"
                  variant="ghost"
                  size="sm"
                  icon="i-ctm-edit"
                  @click="startEdit(r)"
                >
                  Ubah
                </UButton>
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  icon="i-ctm-copy"
                  :disabled="!(r.finalText || r.draftText)"
                  @click="copyRealization(r.rhk.id)"
                >
                  Salin realisasi
                </UButton>
              </div>
            </div>

            <div class="rounded-md bg-muted p-4">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="text-[11px]/4 font-semibold tracking-[1.1px] text-toned uppercase">
                  {{ r.finalText ? 'Narasi realisasi · diubah pengguna' : 'Draf realisasi · disusun dari progres harian' }}
                </span>
                <StatusChip
                  v-if="r.status === 'disalin'"
                  color="success"
                >
                  Sudah disalin
                </StatusChip>
              </div>
              <p
                v-if="r.finalText || r.draftText"
                class="text-sm/[22px] whitespace-pre-line text-highlighted"
              >
                {{ r.finalText ?? r.draftText }}
              </p>
              <p
                v-else
                class="text-sm text-muted"
              >
                Belum ada progres harian untuk RHK ini di {{ data.period.label }}. Realisasi tidak diisi otomatis.
              </p>
              <div
                v-if="r.sources.length"
                class="mt-3"
              >
                <div class="flex flex-wrap items-center gap-1 text-xs/4 text-muted">
                  <span>Sumber: {{ r.sourceCount }} progres harian · {{ r.evidenceCount }} bukti dukung ·</span>
                  <UButton
                    variant="link"
                    class="gap-1 text-xs/4"
                    trailing-icon="i-ctm-chevron-down"
                    :aria-expanded="!!openSources[r.id]"
                    :aria-controls="`sumber-${r.id}`"
                    :ui="{ trailingIcon: openSources[r.id] ? 'size-3.5 rotate-180 transition-transform' : 'size-3.5 transition-transform' }"
                    @click="openSources[r.id] = !openSources[r.id]"
                  >
                    {{ openSources[r.id] ? 'Sembunyikan sumber' : 'Lihat sumber' }}
                  </UButton>
                </div>
                <div
                  v-show="openSources[r.id]"
                  :id="`sumber-${r.id}`"
                  class="pt-3"
                >
                  <ul class="divide-y divide-default rounded-md border border-default bg-default">
                    <li
                      v-for="src in r.sources"
                      :key="src.id"
                      class="grid gap-1 px-3 py-2.5 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:gap-3"
                    >
                      <span class="text-xs text-muted">{{ formatDateShort(src.workDate) }} · <span class="font-mono">{{ formatTime(src.startTime) }}–{{ formatTime(src.endTime) }}</span></span>
                      <span class="min-w-0">
                        <NuxtLink
                          :to="`/progres/${src.id}`"
                          class="text-sm text-highlighted hover:underline"
                        >{{ src.description }}</NuxtLink>
                        <span class="block text-xs text-muted">{{ src.planName }} · realisasi {{ formatNumber(src.realization) }} {{ src.realization ? src.unit : '' }}</span>
                      </span>
                      <span
                        class="text-xs whitespace-nowrap"
                        :class="src.evidenceCount ? 'text-muted' : 'text-warning'"
                      >
                        {{ src.evidenceCount ? `${src.evidenceCount} bukti` : 'Belum ada bukti' }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <p
                v-else
                class="mt-3 text-xs text-muted"
              >
                Sumber: belum ada progres harian di periode ini.
              </p>
            </div>

            <UAlert
              v-for="name in r.excluded"
              :key="name"
              color="warning"
              variant="subtle"
              icon="i-ctm-warning"
              :title="`Rencana aksi “${name}” belum punya progres harian, jadi tidak dimasukkan ke draf realisasi.`"
            />

            <UTable
              v-if="r.plans.length"
              :data="r.plans"
              :columns="columns"
            >
              <template #target-cell="{ row }">
                <span class="whitespace-nowrap tabular-nums">{{ formatNumber(row.original.target) }} {{ row.original.unit }}</span>
              </template>
              <template #realization-cell="{ row }">
                <span class="tabular-nums">{{ formatNumber(row.original.realization) }}</span>
              </template>
              <template #status-cell="{ row }">
                <PlanStatusBadge
                  :status="row.original.status"
                  :overdue="row.original.overdue"
                />
              </template>
            </UTable>
          </div>
        </UCard>

        <p class="text-xs text-muted">
          Draf personal. Narasi hanya berisi aktivitas dari progres harian yang kamu catat. Periksa kembali sebelum disalin ke e-Kinerja.
        </p>
      </div>
      <UModal
        :open="!!editing"
        :title="editing ? `Ubah narasi RHK ${editing.rhk.number}` : ''"
        description="Pastikan narasi tetap sesuai dengan progres harian yang dicatat."
        :ui="{ content: 'sm:max-w-2xl' }"
        @update:open="v => { if (!v) editing = null }"
      >
        <template #body>
          <UTextarea
            v-model="editText"
            :rows="10"
            autoresize
            class="w-full"
            aria-label="Narasi realisasi"
          />
        </template>
        <template #footer>
          <div class="flex w-full flex-wrap justify-between gap-2">
            <UButton
              v-if="editing?.finalText"
              variant="ghost"
              icon="i-ctm-undo"
              @click="saveEdit(true)"
            >
              Kembali ke draf
            </UButton>
            <div class="ml-auto flex gap-2">
              <UButton
                variant="ghost"
                @click="editing = null"
              >
                Batal
              </UButton>
              <UButton @click="saveEdit()">
                Simpan narasi
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
