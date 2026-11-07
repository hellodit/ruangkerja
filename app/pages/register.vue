<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { PASSWORD_MIN, signUpSchema, type SignUpInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Daftar' })

const auth = useAuthSession()
const client = useAuthClient()
const toast = useToast()

const state = reactive({ name: '', email: '', password: '', confirmPassword: '' })
const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')

async function onSubmit(event: FormSubmitEvent<SignUpInput>) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu'
    return
  }
  loading.value = true
  const { error } = await client.signUp.email({
    name: event.data.name,
    email: event.data.email,
    password: event.data.password,
    callbackURL: '/verify-email'
  }, { headers: { 'x-captcha-response': captcha.value } })
  captchaField.value?.reset()
  loading.value = false
  if (error) {
    formError.value = authErrorMessage(error)
    return
  }
  toast.add({ title: 'Akun berhasil dibuat', description: 'Tautan verifikasi sudah dikirim ke email Anda.', color: 'success', icon: 'i-ctm-email-notification' })
  await auth.refresh()
  clearNuxtState('me')
  await navigateTo(auth.loggedIn.value ? '/onboarding/profil' : '/login')
}

async function signUpWithGoogle() {
  formError.value = ''
  const { error } = await client.signIn.social({ provider: 'google', callbackURL: '/onboarding/profil', errorCallbackURL: '/login' })
  if (error) {
    formError.value = authErrorMessage(error)
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <AuthHeader
      eyebrow="Mulai pakai RuangKerja"
      title="Buat akun"
    />

    <UForm
      novalidate
      :schema="signUpSchema"
      :state="state"
      class="flex flex-col gap-5"
      @submit="onSubmit"
    >
      <UFormField
        label="Nama lengkap"
        name="name"
      >
        <UInput
          v-model="state.name"
          autocomplete="name"
          placeholder="Nama sesuai data kepegawaian"
          class="w-full"
        />
      </UFormField>
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
      <UFormField
        label="Kata sandi"
        name="password"
        :help="`Minimal ${PASSWORD_MIN} karakter.`"
      >
        <PasswordInput
          v-model="state.password"
          autocomplete="new-password"
          placeholder="Buat kata sandi"
        />
      </UFormField>
      <UFormField
        label="Konfirmasi kata sandi"
        name="confirmPassword"
      >
        <PasswordInput
          v-model="state.confirmPassword"
          autocomplete="new-password"
          placeholder="Ulangi kata sandi"
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
        Daftar
      </UButton>
    </UForm>

    <USeparator label="atau" />

    <UButton
      color="neutral"
      variant="outline"
      size="lg"
      block
      class="h-12 text-sm/5 font-semibold"
      icon="i-simple-icons-google"
      @click="signUpWithGoogle"
    >
      Daftar dengan Google
    </UButton>

    <div class="flex flex-col gap-2 text-center text-xs/[18px] text-muted">
      <p>
        Sudah punya akun?
        <ULink
          to="/login"
          class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          Masuk
        </ULink>
      </p>
      <p>
        Dengan mendaftar, Anda menyetujui
        <ULink
          to="/privasi"
          target="_blank"
          class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          kebijakan privasi</ULink>. Jangan memasukkan data rahasia atau data warga.
      </p>
    </div>
  </div>
</template>
