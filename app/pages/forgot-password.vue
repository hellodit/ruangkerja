<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { forgotPasswordSchema, type ForgotPasswordInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Lupa kata sandi' })

const client = useAuthClient()
const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'nama@instansi.go.id', autocomplete: 'email', required: true }
]

const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')
const sent = ref(false)

async function onSubmit(event: FormSubmitEvent<ForgotPasswordInput>) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu'
    return
  }
  loading.value = true
  const { error } = await client.requestPasswordReset({ email: event.data.email, redirectTo: '/reset-password' }, {
    headers: { 'x-captcha-response': captcha.value }
  })
  captchaField.value?.reset()
  loading.value = false
  // Errors here never depend on whether the email exists.
  if (error) {
    formError.value = authErrorMessage(error)
    return
  }
  sent.value = true
}
</script>

<template>
  <div
    v-if="sent"
    class="space-y-5 text-center"
  >
    <UIcon
      name="i-ctm-email-notification"
      class="mx-auto size-10 text-brand-ink"
    />
    <p class="text-muted">
      Jika email tersebut terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Tautan berlaku 1 jam.
    </p>
    <UButton
      to="/login"
      color="neutral"
      variant="outline"
      block
    >
      Kembali ke halaman masuk
    </UButton>
  </div>
  <UAuthForm
    v-else
    :schema="forgotPasswordSchema"
    :fields="fields"
    title="Lupa kata sandi"
    description="Masukkan email akun Anda. Kami kirim tautan untuk mengatur ulang kata sandi."
    :submit="{ label: 'Kirim tautan', block: true }"
    :loading="loading"
    @submit="onSubmit"
  >
    <template #validation>
      <div class="space-y-3">
        <UAlert
          v-if="formError"
          color="error"
          variant="subtle"
          icon="i-ctm-alert-circle"
          :title="formError"
        />
        <CaptchaField
          ref="captchaField"
          v-model="captcha"
        />
      </div>
    </template>
    <template #footer>
      <ULink
        to="/login"
        class="text-sm font-medium text-brand-ink"
      >
        Kembali ke halaman masuk
      </ULink>
    </template>
  </UAuthForm>
</template>
