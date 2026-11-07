<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { forgotPasswordSchema, type ForgotPasswordInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Lupa kata sandi' })

const client = useAuthClient()

const state = reactive({ email: '' })
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
    class="flex flex-col gap-5"
  >
    <AuthHeader
      title="Cek email Anda"
      description="Jika email tersebut terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Tautan berlaku 1 jam."
    />
    <UButton
      to="/login"
      color="neutral"
      variant="outline"
      size="lg"
      block
      class="h-12 text-sm/5 font-semibold"
    >
      Kembali ke halaman masuk
    </UButton>
  </div>

  <div
    v-else
    class="flex flex-col gap-5"
  >
    <AuthHeader
      title="Lupa kata sandi"
      description="Masukkan email akun Anda. Kami kirim tautan untuk mengatur ulang kata sandi."
    />

    <UForm
      novalidate
      :schema="forgotPasswordSchema"
      :state="state"
      class="flex flex-col gap-5"
      @submit="onSubmit"
    >
      <UFormField
        label="Email"
        name="email"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="nama@instansi.go.id"
          class="w-full"
        />
      </UFormField>

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

      <UButton
        type="submit"
        size="lg"
        block
        class="h-12 text-sm/5 font-semibold"
        :loading="loading"
      >
        Kirim tautan
      </UButton>
    </UForm>

    <p class="text-center text-xs/[18px] text-muted">
      Ingat kata sandi Anda?
      <ULink
        to="/login"
        class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        Masuk
      </ULink>
    </p>
  </div>
</template>
