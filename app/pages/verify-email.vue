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
  <div class="space-y-5 text-center">
    <UIcon
      :name="failed ? 'i-lucide-circle-x' : 'i-lucide-badge-check'"
      class="mx-auto size-12"
      :class="failed ? 'text-error' : 'text-success'"
    />
    <h1 class="text-xl font-semibold text-highlighted">
      Verifikasi email
    </h1>
    <p class="text-muted">
      {{ failed ? 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.' : 'Email Anda berhasil diverifikasi.' }}
    </p>
    <UButton
      :to="auth.loggedIn.value ? '/beranda' : '/login'"
      block
    >
      {{ auth.loggedIn.value ? 'Buka RuangKerja' : 'Ke halaman masuk' }}
    </UButton>
  </div>
</template>
