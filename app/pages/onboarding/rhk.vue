<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

definePageMeta({ layout: 'onboarding' })
useSeoMeta({ title: 'Isi RHK' })

const notify = useNotify()
const { data: skp, refresh: refreshSkp } = await useFetch('/api/skp', { key: 'skp' })
const { data: list, refresh } = await useFetch('/api/rhks', { key: 'rhks' })

const rhks = computed(() => list.value?.rhks ?? [])
const adding = ref(false)
const openItem = ref<string | undefined>(undefined)
const bulkOpen = ref(false)
const bulkText = ref('')
const bulkSaving = ref(false)

// Open the empty form once, for a first RHK; never re-open it on refresh.
const formKey = ref(0)
let autoOpened = false
watchEffect(() => {
  if (!autoOpened && skp.value?.skp && list.value && !rhks.value.length) {
    autoOpened = true
    adding.value = true
  }
})

const items = computed<AccordionItem[]>(() => rhks.value.map(r => ({ label: r.statement, value: r.id })))

function summary(r: (typeof rhks.value)[number]) {
  if (!r.indicators.length) {
    return 'Belum ada indikator — lengkapi sebelum lanjut'
  }
  const first = r.indicators.find(i => i.aspect === 'kuantitas') ?? r.indicators[0]!
  return `${r.indicators.length} indikator · ${ASPECT_LABELS[first.aspect]}: ${formatNumber(first.target)} ${first.unit}`
}

async function onSaved() {
  await refresh()
  adding.value = false
  openItem.value = undefined
  formKey.value++
}

function startAdding() {
  formKey.value++
  adding.value = true
}

async function saveBulk() {
  bulkSaving.value = true
  try {
    const res = await $fetch<{ created: number }>('/api/rhks/bulk', { method: 'POST', body: { text: bulkText.value } })
    notify.success(`${res.created} RHK ditambahkan`, 'Lengkapi indikator tiap RHK.')
    bulkOpen.value = false
    bulkText.value = ''
    adding.value = false
    await refresh()
    await useMe().refresh()
  } catch (err) {
    notify.error(err)
  } finally {
    bulkSaving.value = false
  }
}

const incomplete = computed(() => rhks.value.filter(r => !r.indicators.length).length)
const canContinue = computed(() => !!skp.value?.skp && rhks.value.length > 0 && incomplete.value === 0)

function onPeriodSaved() {
  refreshSkp()
  refresh()
  notify.success('Periode evaluasi tersimpan')
}
</script>

<template>
  <OnboardingShell :step="2">
    <div class="flex flex-col gap-6">
      <div class="max-w-2xl space-y-2">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted">
          Isi RHK kamu
        </h1>
        <p class="text-muted">
          Atur periode evaluasi, lalu masukkan setiap RHK beserta indikator dan targetnya.
        </p>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">
            Periode evaluasi
          </h2>
        </template>
        <PeriodSettingsForm
          :key="skp?.skp?.id ?? 'new'"
          :initial="skp?.skp"
          :today="skp?.today ?? todayInTimeZone('Asia/Jakarta')"
          @saved="onPeriodSaved"
        />
      </UCard>

      <section
        aria-labelledby="ob-rhk-title"
        class="flex flex-col gap-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="ob-rhk-title"
            class="text-lg font-semibold text-highlighted"
          >
            RHK kamu
          </h2>
          <UButton
            v-if="skp?.skp"
            color="neutral"
            variant="ghost"
            icon="i-lucide-clipboard-paste"
            @click="bulkOpen = true"
          >
            Tempel beberapa RHK
          </UButton>
        </div>

        <UAlert
          v-if="!skp?.skp"
          color="warning"
          variant="subtle"
          icon="i-lucide-calendar"
          title="Simpan periode evaluasi dulu"
          description="RHK disimpan untuk tahun SKP yang dipilih."
        />

        <UCard
          v-if="rhks.length"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
          <UAccordion
            v-model="openItem"
            :items="items"
            :ui="{ item: 'px-4 sm:px-6', trigger: 'py-4' }"
          >
            <template #leading="{ item }">
              <UIcon
                :name="rhks.find(r => r.id === item.value)?.indicators.length ? 'i-lucide-circle-check' : 'i-lucide-clock'"
                class="size-5 shrink-0"
                :class="rhks.find(r => r.id === item.value)?.indicators.length ? 'text-success' : 'text-warning'"
              />
            </template>
            <template #default="{ item }">
              <span
                v-for="r in rhks.filter(x => x.id === item.value)"
                :key="r.id"
                class="flex min-w-0 flex-col gap-1 text-left"
              >
                <span class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-semibold tracking-wide text-muted uppercase">RHK {{ r.number }}</span>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >{{ RHK_TYPE_LABELS[r.type] }}</UBadge>
                </span>
                <span class="font-semibold text-highlighted">{{ r.statement }}</span>
                <span class="text-sm text-muted">{{ summary(r) }}</span>
              </span>
            </template>
            <template #body="{ item }">
              <div class="pb-6">
                <RhkForm
                  v-for="r in rhks.filter(x => x.id === item.value)"
                  :key="r.id"
                  :rhk-id="r.id"
                  :initial="{ supervisorRhk: r.supervisorRhk ?? '', statement: r.statement, type: r.type, indicators: r.indicators.map(i => ({ aspect: i.aspect, indicator: i.indicator, target: i.target, unit: i.unit })) }"
                  cancelable
                  @saved="onSaved"
                  @cancel="openItem = undefined"
                />
              </div>
            </template>
          </UAccordion>
        </UCard>

        <UCard v-if="adding && skp?.skp">
          <template #header>
            <div class="flex items-center gap-2">
              <UBadge
                color="info"
                variant="subtle"
              >
                Sedang diisi
              </UBadge>
              <span class="text-sm font-semibold text-highlighted">RHK {{ rhks.length + 1 }}</span>
            </div>
          </template>
          <RhkForm
            :key="formKey"
            :cancelable="rhks.length > 0"
            @saved="onSaved"
            @cancel="adding = false"
          />
        </UCard>

        <UButton
          v-if="skp?.skp && !adding"
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          class="self-start"
          @click="startAdding"
        >
          Tambah RHK
        </UButton>
      </section>
    </div>

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
            color="neutral"
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

    <template #footer>
      <UButton
        to="/onboarding/profil"
        color="neutral"
        variant="outline"
        size="lg"
        icon="i-lucide-chevron-left"
      >
        Kembali
      </UButton>
      <span class="min-w-60 flex-1 text-sm text-muted">
        <template v-if="incomplete">{{ incomplete }} RHK belum punya indikator.</template>
        <template v-else>{{ rhks.length }} RHK tersimpan. RHK lain bisa ditambah kapan saja dari menu RHK saya.</template>
      </span>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        @click="notify.success('Tersimpan', 'Lanjutkan kapan saja.')"
      >
        Simpan dan lanjutkan nanti
      </UButton>
      <UButton
        to="/onboarding/ringkasan"
        size="lg"
        trailing-icon="i-lucide-chevron-right"
        :disabled="!canContinue"
      >
        Lanjut
      </UButton>
    </template>
  </OnboardingShell>
</template>
