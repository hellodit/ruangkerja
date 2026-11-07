<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { PASSWORD_MIN, resetPasswordSchema, type ResetPasswordInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Buat kata sandi baru', robots: 'noindex' })

const route = useRoute()
const client = useAuthClient()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
/** Set when the API rejects the token (used or past its 1-hour limit). */
const tokenRejected = ref(false)
const expired = computed(() => tokenRejected.value || !token.value || typeof route.query.error === 'string')
const state = reactive({ password: '', confirmPassword: '' })
const loading = ref(false)
const formError = ref('')

async function onSubmit(event: FormSubmitEvent<ResetPasswordInput>) {
  formError.value = ''
  loading.value = true
  const { error } = await client.resetPassword({ newPassword: event.data.password, token: token.value })
  loading.value = false
  if (error) {
    if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
      tokenRejected.value = true
    } else {
      formError.value = authErrorMessage(error)
    }
    return
  }
  await navigateTo({ path: '/login', query: { status: 'sandi-baru' } })
}
</script>

<template>
  <div
    v-if="expired"
    class="flex flex-col gap-6"
  >
    <AuthIconTile
      icon="i-ctm-clock"
      tone="warning"
    />
    <AuthHeader
      title="Tautan sudah tidak berlaku"
      description="Tautan atur ulang hanya bisa dipakai sekali dan punya batas waktu. Minta tautan baru untuk melanjutkan."
    />
    <UButton
      to="/forgot-password"
      size="lg"
      block
      :class="AUTH_BUTTON"
      icon="i-ctm-send"
    >
      Minta tautan baru
    </UButton>
    <p class="text-center text-sm/5">
      <ULink
        to="/login"
        :class="AUTH_LINK"
      >
        Kembali ke halaman masuk
      </ULink>
    </p>
  </div>

  <div
    v-else
    class="flex flex-col gap-6"
  >
    <AuthHeader
      title="Buat kata sandi baru"
      description="Setelah disimpan, kamu keluar dari semua perangkat dan masuk lagi dengan kata sandi baru."
    />

    <UAlert
      v-if="formError"
      color="error"
      variant="subtle"
      icon="i-ctm-alert-circle"
      :title="formError"
      role="alert"
    />

    <UForm
      novalidate
      :schema="resetPasswordSchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Kata sandi baru"
        name="password"
        :help="`Minimal ${PASSWORD_MIN} karakter. Jangan pakai kata sandi akun lain.`"
      >
        <PasswordInput
          v-model="state.password"
          autocomplete="new-password"
          placeholder="Buat kata sandi baru"
        />
      </UFormField>
      <UFormField
        label="Ulangi kata sandi baru"
        name="confirmPassword"
      >
        <PasswordInput
          v-model="state.confirmPassword"
          autocomplete="new-password"
          placeholder="Ketik ulang kata sandi baru"
        />
      </UFormField>

      <UButton
        type="submit"
        size="lg"
        block
        :class="AUTH_BUTTON"
        :loading="loading"
      >
        Simpan kata sandi
      </UButton>
    </UForm>
  </div>
</template>
