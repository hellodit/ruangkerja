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
  <div class="flex flex-col gap-5">
    <AuthHeader
      eyebrow="Verifikasi email"
      :title="failed ? 'Verifikasi gagal' : 'Email terverifikasi'"
      :description="failed ? 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.' : 'Email Anda berhasil diverifikasi.'"
    />
    <UAlert
      :color="failed ? 'error' : 'success'"
      variant="subtle"
      :icon="failed ? 'i-ctm-alert-circle' : 'i-ctm-checkmark-circle'"
      :title="failed ? 'Minta tautan verifikasi baru dari halaman Profil setelah masuk.' : 'Akun Anda siap dipakai.'"
    />
    <UButton
      :to="auth.loggedIn.value ? '/beranda' : '/login'"
      size="lg"
      block
      class="h-12 text-sm/5 font-semibold"
    >
      {{ auth.loggedIn.value ? 'Buka RuangKerja' : 'Ke halaman masuk' }}
    </UButton>
  </div>
</template>
