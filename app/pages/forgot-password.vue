<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { forgotPasswordSchema, type ForgotPasswordInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Lupa kata sandi' })

const client = useAuthClient()

const RESEND_SECONDS = 60
const state = reactive({ email: '' })
const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')
const sent = ref(false)
/** Seconds until "Kirim ulang" is allowed again (the endpoint allows 3 per minute). */
const cooldown = ref(0)
const timer = useIntervalFn(() => {
  cooldown.value = Math.max(0, cooldown.value - 1)
  if (!cooldown.value) timer.pause()
}, 1000, { immediate: false })
const cooldownText = computed(() => `${Math.floor(cooldown.value / 60)}:${String(cooldown.value % 60).padStart(2, '0')}`)

async function request(email: string) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu'
    return
  }
  loading.value = true
  const { error } = await client.requestPasswordReset({ email, redirectTo: '/reset-password' }, {
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
  cooldown.value = RESEND_SECONDS
  timer.resume()
}

function onSubmit(event: FormSubmitEvent<ForgotPasswordInput>) {
  return request(event.data.email)
}

function useOtherEmail() {
  sent.value = false
  formError.value = ''
}
</script>

<template>
  <div
    v-if="sent"
    class="flex flex-col gap-6"
  >
    <AuthIconTile icon="i-ctm-email-notification" />
    <AuthHeader title="Cek email untuk atur ulang">
      Bila <b class="font-semibold text-highlighted">{{ state.email }}</b> terdaftar, kami mengirim tautan untuk membuat kata sandi baru. Tautan itu hanya bisa dipakai sekali dan berlaku 1 jam.
    </AuthHeader>

    <UAlert
      color="info"
      variant="subtle"
      description="Email belum masuk? Tunggu beberapa menit, lalu periksa folder Spam atau Promosi."
      role="note"
    />
    <UAlert
      v-if="formError"
      color="error"
      variant="subtle"
      icon="i-ctm-alert-circle"
      :title="formError"
      role="alert"
    />

    <div class="flex flex-col gap-3">
      <CaptchaField
        v-if="!cooldown"
        ref="captchaField"
        v-model="captcha"
      />
      <UButton
        color="neutral"
        variant="outline"
        size="lg"
        block
        :class="AUTH_BUTTON"
        icon="i-ctm-refresh"
        :disabled="cooldown > 0"
        :loading="loading"
        @click="request(state.email)"
      >
        {{ cooldown ? `Kirim ulang dalam ${cooldownText}` : 'Kirim ulang email' }}
      </UButton>
      <p class="text-center text-sm/5 text-toned">
        Salah ketik email?
        <ULink
          as="button"
          :class="AUTH_LINK"
          @click="useOtherEmail"
        >
          Pakai email lain
        </ULink>
      </p>
    </div>

    <p class="border-t border-default pt-6 text-center text-sm/5">
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
    <ULink
      to="/login"
      class="inline-flex min-h-11 items-center gap-1.5 self-start text-sm/5"
      :class="AUTH_LINK"
    >
      <UIcon
        name="i-ctm-chevron-left"
        class="size-4"
      />
      Kembali ke halaman masuk
    </ULink>
    <AuthHeader
      title="Lupa kata sandi?"
      description="Masukkan email akunmu. Kami kirim tautan untuk membuat kata sandi baru."
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
      :schema="forgotPasswordSchema"
      :state="state"
      class="flex flex-col gap-4"
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

      <CaptchaField
        ref="captchaField"
        v-model="captcha"
      />

      <UButton
        type="submit"
        size="lg"
        block
        :class="AUTH_BUTTON"
        icon="i-ctm-send"
        :loading="loading"
      >
        Kirim tautan atur ulang
      </UButton>
    </UForm>
  </div>
</template>
