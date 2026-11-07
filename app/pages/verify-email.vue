<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Verifikasi email', robots: 'noindex' })

const route = useRoute()
const auth = useAuthSession()
// Better Auth redirects here after verification; failures carry ?error=...
const failed = computed(() => typeof route.query.error === 'string')
await auth.refresh()
</script>

<template>
  <div class="flex flex-col gap-6">
    <AuthIconTile
      :icon="failed ? 'i-ctm-clock' : 'i-ctm-checkmark-circle'"
      :tone="failed ? 'warning' : 'success'"
    />
    <AuthHeader
      :title="failed ? 'Tautan verifikasi sudah tidak berlaku' : 'Email terverifikasi'"
      :description="failed ? 'Tautan verifikasi hanya bisa dipakai sekali dan punya batas waktu. Kirim ulang dari halaman Profil setelah masuk.' : 'Terima kasih. Emailmu sudah terverifikasi.'"
    />
    <UButton
      :to="auth.loggedIn.value ? (failed ? '/profil' : '/beranda') : '/login'"
      size="lg"
      block
      :class="AUTH_BUTTON"
    >
      {{ auth.loggedIn.value ? (failed ? 'Buka Profil' : 'Lanjut ke Ruang Kerja') : 'Ke halaman masuk' }}
    </UButton>
  </div>
</template>
