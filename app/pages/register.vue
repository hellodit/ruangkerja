<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { signUpSchema, type SignUpInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Daftar' })

const auth = useAuthSession()
const client = useAuthClient()
const toast = useToast()

const fields: AuthFormField[] = [
  { name: 'name', type: 'text', label: 'Nama lengkap', placeholder: 'Nama sesuai data kepegawaian', autocomplete: 'name', required: true },
  { name: 'email', type: 'email', label: 'Email', placeholder: 'nama@instansi.go.id', autocomplete: 'email', required: true },
  { name: 'password', type: 'password', label: 'Kata sandi', description: 'Minimal 8 karakter.', autocomplete: 'new-password', required: true },
  { name: 'confirmPassword', type: 'password', label: 'Konfirmasi kata sandi', autocomplete: 'new-password', required: true }
]

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
  toast.add({ title: 'Akun berhasil dibuat', description: 'Tautan verifikasi sudah dikirim ke email Anda.', color: 'success', icon: 'i-lucide-mail-check' })
  await auth.refresh()
  clearNuxtState('me')
  await navigateTo(auth.loggedIn.value ? '/onboarding/profil' : '/login')
}

async function signUpWithGoogle() {
  const { error } = await client.signIn.social({ provider: 'google', callbackURL: '/onboarding/profil', errorCallbackURL: '/login' })
  if (error) {
    formError.value = authErrorMessage(error)
  }
}
</script>

<template>
  <UAuthForm
    :schema="signUpSchema"
    :fields="fields"
    title="Buat akun RuangKerja"
    :providers="[{ label: 'Daftar dengan Google', icon: 'i-simple-icons-google', color: 'neutral', variant: 'outline', block: true, onClick: signUpWithGoogle }]"
    separator="atau"
    :submit="{ label: 'Daftar', block: true }"
    :loading="loading"
    @submit="onSubmit"
  >
    <template #description>
      Sudah punya akun?
      <ULink
        to="/login"
        class="font-medium text-brand-ink"
      >
        Masuk
      </ULink>
    </template>
    <template #validation>
      <div class="space-y-3">
        <UAlert
          v-if="formError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="formError"
        />
        <CaptchaField
          ref="captchaField"
          v-model="captcha"
        />
      </div>
    </template>
    <template #footer>
      <p class="text-xs text-muted">
        Dengan mendaftar, Anda menyetujui
        <ULink
          to="/privasi"
          target="_blank"
          class="font-medium text-brand-ink"
        >
          kebijakan privasi
        </ULink>
        dan memahami bahwa RuangKerja adalah alat bantu personal yang independen, bukan aplikasi resmi pemerintah. Jangan memasukkan data rahasia atau data warga.
      </p>
    </template>
  </UAuthForm>
</template>
