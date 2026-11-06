<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent, TabsItem } from '@nuxt/ui'
import { magicLinkSchema, signInSchema, type MagicLinkInput, type SignInInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Masuk' })

const route = useRoute()
const auth = useAuthSession()
const client = useAuthClient()

const mode = ref<'password' | 'link'>('password')
const tabs: TabsItem[] = [
  { label: 'Kata sandi', value: 'password', icon: 'i-lucide-key-round' },
  { label: 'Tautan ke email', value: 'link', icon: 'i-lucide-mail' }
]

const passwordFields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'nama@instansi.go.id', autocomplete: 'email', required: true },
  { name: 'password', type: 'password', label: 'Kata sandi', placeholder: 'Masukkan kata sandi', autocomplete: 'current-password', required: true },
  { name: 'remember', type: 'checkbox', label: 'Ingat saya', defaultValue: true }
]
const linkFields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'nama@instansi.go.id', autocomplete: 'email', required: true }
]

const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')
const linkSent = ref(false)

const redirectTo = computed(() => safeRedirect(route.query.redirect, '/beranda'))

const oauthError = computed(() => {
  const err = route.query.error
  if (typeof err !== 'string' || !err) {
    return ''
  }
  if (err.replace(/\s+/g, '_').toLowerCase() === 'account_not_linked') {
    return 'Email ini sudah terdaftar dengan kata sandi tetapi belum diverifikasi. Masuk dengan kata sandi lalu verifikasi email, atau atur ulang kata sandi, sebelum memakai Google.'
  }
  return /token|expired/i.test(err) ? 'Tautan masuk tidak valid atau sudah kedaluwarsa. Minta tautan baru.' : 'Gagal masuk. Silakan coba lagi.'
})

function needCaptcha() {
  if (!captcha.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu'
    return true
  }
  return false
}

async function afterSignIn() {
  await auth.refresh()
  clearNuxtState('me')
  await navigateTo(redirectTo.value)
}

async function onPassword(event: FormSubmitEvent<SignInInput>) {
  formError.value = ''
  if (needCaptcha()) {
    return
  }
  loading.value = true
  const { error } = await client.signIn.email({
    email: event.data.email,
    password: event.data.password,
    rememberMe: event.data.remember ?? true
  }, { headers: { 'x-captcha-response': captcha.value } })
  captchaField.value?.reset()
  loading.value = false
  if (error) {
    formError.value = authErrorMessage(error)
    return
  }
  await afterSignIn()
}

async function onMagicLink(event: FormSubmitEvent<MagicLinkInput>) {
  formError.value = ''
  if (needCaptcha()) {
    return
  }
  loading.value = true
  const { error } = await client.signIn.magicLink({
    email: event.data.email,
    callbackURL: redirectTo.value,
    errorCallbackURL: '/login'
  }, { headers: { 'x-captcha-response': captcha.value } })
  captchaField.value?.reset()
  loading.value = false
  if (error && (error.status === 429 || error.status === 400 || error.status === 403)) {
    formError.value = authErrorMessage(error)
    return
  }
  // Same message whether or not the email is registered.
  linkSent.value = true
}

async function signInWithGoogle() {
  formError.value = ''
  const { error } = await client.signIn.social({ provider: 'google', callbackURL: redirectTo.value, errorCallbackURL: '/login' })
  if (error) {
    formError.value = authErrorMessage(error)
  }
}

const providers = [{ label: 'Lanjutkan dengan Google', icon: 'i-simple-icons-google', color: 'neutral' as const, variant: 'outline' as const, block: true, onClick: signInWithGoogle }]
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="linkSent"
      class="space-y-4 text-center"
    >
      <UIcon
        name="i-lucide-mail-check"
        class="mx-auto size-10 text-brand-ink"
      />
      <h1 class="text-xl font-semibold text-highlighted">
        Cek email Anda
      </h1>
      <p class="text-muted">
        Jika email tersebut terdaftar, tautan masuk sudah dikirim. Tautan berlaku 15 menit.
      </p>
      <UButton
        color="neutral"
        variant="outline"
        block
        @click="linkSent = false"
      >
        Kembali
      </UButton>
    </div>

    <template v-else>
      <UTabs
        v-model="mode"
        :items="tabs"
        :content="false"
        class="w-full"
      />

      <UAuthForm
        v-if="mode === 'password'"
        :schema="signInSchema"
        :fields="passwordFields"
        title="Masuk ke RuangKerja"
        :providers="providers"
        separator="atau"
        :submit="{ label: 'Masuk', block: true }"
        :loading="loading"
        @submit="onPassword"
      >
        <template #description>
          Belum punya akun?
          <ULink
            to="/register"
            class="font-medium text-brand-ink"
          >
            Daftar
          </ULink>
        </template>
        <template #password-hint>
          <ULink
            to="/forgot-password"
            class="text-sm font-medium text-brand-ink"
            tabindex="-1"
          >
            Lupa kata sandi?
          </ULink>
        </template>
        <template #validation>
          <div class="space-y-3">
            <UAlert
              v-if="formError || oauthError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="formError || oauthError"
            />
            <CaptchaField
              ref="captchaField"
              v-model="captcha"
            />
          </div>
        </template>
      </UAuthForm>

      <UAuthForm
        v-else
        :schema="magicLinkSchema"
        :fields="linkFields"
        title="Masuk lewat tautan"
        description="Kami kirim tautan masuk sekali pakai ke email Anda."
        :submit="{ label: 'Kirim tautan masuk', block: true }"
        :loading="loading"
        @submit="onMagicLink"
      >
        <template #validation>
          <div class="space-y-3">
            <UAlert
              v-if="formError || oauthError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="formError || oauthError"
            />
            <CaptchaField
              ref="captchaField"
              v-model="captcha"
            />
          </div>
        </template>
      </UAuthForm>
    </template>
  </div>
</template>
