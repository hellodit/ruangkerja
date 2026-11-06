<script setup lang="ts">
import type { InternalApi } from 'nitropack'

useSeoMeta({ title: 'Ubah progres harian' })
const route = useRoute()
const notify = useNotify()
const copy = useCopyText()
const { me } = useMe()
const id = computed(() => String(route.params.id))
const { data, error } = await useFetch<InternalApi['/api/progress/:id']['get']>(() => `/api/progress/${id.value}`)
if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Progres harian tidak ditemukan', fatal: true })
}

const initial = computed(() => data.value
  ? {
      actionPlanId: data.value.actionPlanId,
      workDate: data.value.workDate,
      startTime: data.value.startTime,
      endTime: data.value.endTime,
      description: data.value.description,
      inputMethod: data.value.inputMethod,
      realization: data.value.realization,
      category: data.value.category,
      marksPlanComplete: data.value.marksPlanComplete,
      results: data.value.results.length
        ? data.value.results.map(r => ({ name: r.name, evidenceUrl: r.evidenceUrl ?? '' }))
        : [{ name: '', evidenceUrl: '' }]
    }
  : undefined)

const deleteOpen = ref(false)
async function remove() {
  try {
    await $fetch(`/api/progress/${id.value}`, { method: 'DELETE' })
    await useMe().refresh()
    notify.success('Progres harian dihapus')
    await navigateTo('/progres')
  } catch (err) {
    notify.error(err)
  }
}

async function onSaved() {
  notify.success('Progres harian diperbarui')
  await navigateTo('/progres')
}
</script>

<template>
  <UDashboardPanel id="progres-ubah">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UButton
            to="/progres"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            aria-label="Kembali ke daftar progres harian"
          />
        </template>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs text-muted">Progres harian</span>
            <h1 class="text-xl font-semibold text-highlighted">
              Ubah progres harian
            </h1>
          </div>
        </template>
        <template #right>
          <UButton
            v-if="data"
            icon="i-lucide-copy"
            color="neutral"
            variant="outline"
            @click="copy(data.ekinerjaText)"
          >
            Salin untuk e-Kinerja
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-6xl">
        <ProgressForm
          v-if="initial"
          :progress-id="id"
          :initial="initial"
          :original-realization="data?.realization ?? 0"
          :today="me?.today ?? todayInTimeZone('Asia/Jakarta')"
          @saved="onSaved"
        >
          <template #actions>
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="mr-auto"
              @click="deleteOpen = true"
            >
              Hapus
            </UButton>
          </template>
        </ProgressForm>
      </div>
      <UModal
        v-model:open="deleteOpen"
        title="Hapus progres harian ini?"
        description="Catatan dan tautan buktinya tidak lagi dipakai di realisasi."
      >
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="deleteOpen = false"
            >
              Batal
            </UButton>
            <UButton
              color="error"
              @click="remove"
            >
              Hapus progres
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
