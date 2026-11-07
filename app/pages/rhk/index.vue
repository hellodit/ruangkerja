<script setup lang="ts">
useSeoMeta({ title: 'RHK saya' })

const { data, refresh } = await useFetch('/api/rhks', { key: 'rhks' })
const { data: skp } = await useFetch('/api/skp', { key: 'skp' })
const periodOpen = ref(false)
const bulkOpen = ref(false)
const bulkText = ref('')
const bulkSaving = ref(false)
const notify = useNotify()

const rhks = computed(() => data.value?.rhks ?? [])
const indicatorCount = computed(() => rhks.value.reduce((n, r) => n + r.indicators.length, 0))

function summaryText(s: { plans: number, done: number, overdue: number, notStarted: number, progress: number }) {
  const parts = [`${s.plans} rencana aksi`, `${s.done} selesai`]
  if (s.overdue) {
    parts.push(`${s.overdue} lewat tenggat`)
  }
  if (s.notStarted) {
    parts.push(`${s.notStarted} belum dimulai`)
  }
  parts.push(`${s.progress} progres harian`)
  return parts.join(' · ')
}

async function saveBulk() {
  bulkSaving.value = true
  try {
    const res = await $fetch<{ created: number }>('/api/rhks/bulk', { method: 'POST', body: { text: bulkText.value } })
    notify.success(`${res.created} RHK ditambahkan`, 'Lengkapi indikator tiap RHK lewat tombol Ubah.')
    bulkOpen.value = false
    bulkText.value = ''
    await refresh()
    await useMe().refresh()
  } catch (err) {
    notify.error(err)
  } finally {
    bulkSaving.value = false
  }
}

async function onPeriodSaved() {
  periodOpen.value = false
  await Promise.all([refresh(), refreshNuxtData('skp')])
  notify.success('Periode evaluasi tersimpan')
}
</script>

<template>
  <UDashboardPanel id="rhk">
    <template #header>
      <UDashboardNavbar title="RHK saya" />
    </template>

    <template #body>
      <div class="flex w-full max-w-[1200px] flex-col gap-5">
        <div
          v-if="data?.skp"
          class="flex flex-wrap items-center gap-x-4 gap-y-3"
        >
          <p class="flex-1 basis-60 text-sm text-toned">
            <span class="font-semibold text-highlighted">SKP {{ data.skp.year }}</span>
            · Penilaian {{ data.skp.evaluationFrequency === 'monthly' ? 'bulanan' : 'triwulanan' }} · {{ rhks.length }} RHK · {{ indicatorCount }} indikator
          </p>
          <UButton
            variant="ghost"
            icon="i-ctm-copy"
            @click="bulkOpen = true"
          >
            Tempel beberapa RHK
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-ctm-date"
            @click="periodOpen = true"
          >
            Ubah periode evaluasi
          </UButton>
          <UButton
            to="/rhk/tambah"
            icon="i-ctm-plus"
          >
            Tambah RHK
          </UButton>
        </div>
        <UEmpty
          v-if="!data?.skp"
          icon="i-ctm-date"
          title="Atur periode evaluasi"
          description="Pilih tahun SKP dan periode penilaian sebelum memasukkan RHK."
          :actions="[{ label: 'Atur periode evaluasi', onClick: () => { periodOpen = true } }]"
        />
        <UEmpty
          v-else-if="!rhks.length"
          icon="i-ctm-policy"
          title="Belum ada RHK"
          description="Masukkan RHK dari SKP yang sudah disetujui atasan."
          :actions="[{ label: 'Tambah RHK', to: '/rhk/tambah', icon: 'i-ctm-plus' }]"
        />

        <UCard
          v-for="r in rhks"
          :key="r.id"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <div class="flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-default px-5 py-5 sm:px-6">
            <div class="flex min-w-0 flex-1 basis-80 flex-col gap-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <RhkTag :number="r.number" />
                <UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ RHK_TYPE_LABELS[r.type] }}
                </UBadge>
              </div>
              <h2 class="text-[17px]/6 font-semibold text-highlighted">
                <NuxtLink
                  :to="`/rhk/${r.id}`"
                  class="hover:underline"
                >
                  {{ r.statement }}
                </NuxtLink>
              </h2>
              <p
                v-if="r.supervisorRhk"
                class="text-[13px]/[18px] text-toned"
              >
                Mendukung RHK atasan: {{ r.supervisorRhk }}
              </p>
            </div>
            <UButton
              :to="`/rhk/${r.id}/ubah`"
              icon="i-ctm-edit"
              variant="ghost"
              size="sm"
              :aria-label="`Ubah RHK ${r.number}`"
            >
              Ubah
            </UButton>
          </div>

          <div
            v-if="!r.indicators.length"
            class="px-5 py-4 sm:px-6"
          >
            <UAlert
              color="warning"
              variant="subtle"
              icon="i-ctm-warning"
              title="Belum ada indikator"
              description="Tambahkan indikator dan target tahunan lewat tombol Ubah."
            />
          </div>
          <UTable
            v-else
            :data="r.indicators"
            :columns="[{ accessorKey: 'aspect', header: 'Aspek', meta: { class: { th: 'w-35' } } }, { accessorKey: 'indicator', header: 'Indikator kinerja individu' }, { accessorKey: 'target', header: 'Target tahunan', meta: { class: { th: 'w-45' } } }]"
          >
            <template #aspect-cell="{ row }">
              {{ ASPECT_LABELS[row.original.aspect] }}
            </template>
            <template #target-cell="{ row }">
              <span class="whitespace-nowrap tabular-nums">{{ formatNumber(row.original.target) }} {{ row.original.unit }}</span>
            </template>
          </UTable>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-default px-5 py-3.5 text-[13px]/[18px] text-toned sm:px-6">
            <span>
              <template v-if="data?.current">{{ data.current.label }}: </template>{{ summaryText(r.summary) }}
            </span>
            <ULink
              :to="`/rhk/${r.id}`"
              class="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
            >
              Buka detail RHK
            </ULink>
          </div>
        </UCard>
        <p class="text-xs text-muted">
          Perubahan RHK di Ruang Kerja tidak mengubah SKP resmi di e-Kinerja.
        </p>
      </div>
      <UModal
        v-model:open="periodOpen"
        title="Periode evaluasi"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <PeriodSettingsForm
            :initial="skp?.skp"
            :today="skp?.today ?? todayInTimeZone('Asia/Jakarta')"
            @saved="onPeriodSaved"
          />
        </template>
      </UModal>

      <UModal
        v-model:open="bulkOpen"
        title="Tempel beberapa RHK"
        description="Satu RHK per baris, salin dari SKP yang sudah disetujui. Indikator dilengkapi setelahnya."
      >
        <template #body>
          <UFormField
            label="Daftar RHK"
            name="text"
          >
            <UTextarea
              v-model="bulkText"
              :rows="8"
              class="w-full"
              placeholder="1. Tersusunnya kajian kebijakan perencanaan pembangunan daerah&#10;2. Terlaksananya fasilitasi forum konsultasi publik"
            />
          </UFormField>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              variant="ghost"
              @click="bulkOpen = false"
            >
              Batal
            </UButton>
            <UButton
              :loading="bulkSaving"
              :disabled="!bulkText.trim()"
              @click="saveBulk"
            >
              Tambahkan RHK
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
