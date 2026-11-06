<script setup lang="ts">
import type { InternalApi } from 'nitropack'

useSeoMeta({ title: 'Ubah RHK' })
const route = useRoute()
const notify = useNotify()
const id = computed(() => String(route.params.id))
const { data, error } = await useFetch<InternalApi['/api/rhks/:id']['get']>(() => `/api/rhks/${id.value}`)
if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'RHK tidak ditemukan', fatal: true })
}
const deleteOpen = ref(false)
const deleting = ref(false)

const initial = computed(() => data.value
  ? {
      supervisorRhk: data.value.rhk.supervisorRhk ?? '',
      statement: data.value.rhk.statement,
      type: data.value.rhk.type,
      indicators: data.value.rhk.indicators.map(i => ({ aspect: i.aspect, indicator: i.indicator, target: i.target, unit: i.unit }))
    }
  : undefined)

async function onSaved() {
  notify.success('RHK diperbarui')
  await navigateTo(`/rhk/${id.value}`)
}

async function remove() {
  deleting.value = true
  try {
    await $fetch(`/api/rhks/${id.value}`, { method: 'DELETE' })
    await useMe().refresh()
    notify.success('RHK dihapus')
    await navigateTo('/rhk')
  } catch (err) {
    notify.error(err)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="rhk-ubah">
    <template #header>
      <UDashboardNavbar :title="`Ubah RHK ${data?.rhk.number ?? ''}`">
        <template #leading>
          <UButton :to="`/rhk/${id}`" icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="Kembali ke detail RHK" />
        </template>
        <template #right>
          <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteOpen = true">
            Hapus RHK
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <UAlert color="neutral" variant="subtle" icon="i-lucide-info" title="Perubahan di RuangKerja tidak mengubah SKP resmi di e-Kinerja." />
        <UCard>
          <RhkForm v-if="initial" :rhk-id="id" :initial="initial" submit-label="Simpan perubahan" cancelable @saved="onSaved" @cancel="navigateTo(`/rhk/${id}`)" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="deleteOpen" title="Hapus RHK ini?" description="Rencana aksi dan progres harian di bawahnya ikut disembunyikan dari semua halaman.">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="deleteOpen = false">
          Batal
        </UButton>
        <UButton color="error" :loading="deleting" @click="remove">
          Hapus RHK {{ data?.rhk.number }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
