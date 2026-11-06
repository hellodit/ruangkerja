<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'id' }
})

useSeoMeta({
  titleTemplate: title => (title ? `${title} · RuangKerja` : 'RuangKerja'),
  description: 'RuangKerja — asisten kerja digital personal untuk ASN: rencana aksi per RHK, progres harian, bukti dukung, dan draf realisasi.'
})
</script>

<template>
  <UApp :toaster="{ position: 'top-right', max: 3 }">
    <NuxtLoadingIndicator color="var(--color-brand-400)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
