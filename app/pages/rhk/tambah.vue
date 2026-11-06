<script setup lang="ts">
useSeoMeta({ title: 'Tambah RHK' })
const notify = useNotify()

async function onSaved(id: string) {
  notify.success('RHK tersimpan')
  await navigateTo(`/rhk/${id}`)
}
</script>

<template>
  <UDashboardPanel id="rhk-tambah">
    <template #header>
      <UDashboardNavbar title="Tambah RHK">
        <template #leading>
          <UButton to="/rhk" icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="Kembali ke RHK saya" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UCard class="mx-auto w-full max-w-4xl">
        <RhkForm cancelable @saved="onSaved" @cancel="navigateTo('/rhk')" />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
