<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  // Icon set lives in public/images/icon. The .ico declares sizes="32x32"
  // so Chrome still prefers the SVG; /favicon.ico at the root is a copy for
  // clients that request it without reading these tags.
  link: [
    { rel: 'icon', href: '/images/icon/favicon.ico', sizes: '32x32' },
    { rel: 'icon', href: '/images/icon/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', href: '/images/icon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    { rel: 'icon', href: '/images/icon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    { rel: 'apple-touch-icon', href: '/images/icon/apple-touch-icon.png', sizes: '180x180' }
  ],
  htmlAttrs: { lang: 'id' }
})

useSeoMeta({
  titleTemplate: title => (title ? `${title} · Ruang Kerja` : 'Ruang Kerja'),
  description: 'Ruang Kerja — asisten kerja digital personal untuk ASN: rencana aksi per RHK, progres harian, bukti dukung, dan draf realisasi.'
})
</script>

<template>
  <UApp :toaster="{ position: 'top-right', max: 3 }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
