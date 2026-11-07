<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { signInSchema, type SignInInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Masuk' })

const route = useRoute()
const auth = useAuthSession()
const client = useAuthClient()

const state = reactive({ email: '', password: '', remember: true })
const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
/** Wrong email or password: banner plus a red password field. */
const wrongCredentials = ref(false)
const formError = ref('')

const redirectTo = computed(() => safeRedirect(route.query.redirect, '/beranda'))
// Set by the reset-password page after a successful change.
const passwordChanged = computed(() => route.query.status === 'sandi-baru')

const oauthError = computed(() => {
  const err = route.query.error
  if (typeof err !== 'string' || !err) {
    return ''
  }
  if (err.replace(/\s+/g, '_').toLowerCase() === 'account_not_linked') {
    return 'Email ini sudah terdaftar dengan kata sandi tetapi belum diverifikasi. Masuk dengan kata sandi lalu verifikasi email, atau atur ulang kata sandi, sebelum memakai Google.'
  }
  return /token|expired/i.test(err) ? 'Tautan tidak valid atau sudah kedaluwarsa.' : 'Gagal masuk. Silakan coba lagi.'
})
const errorText = computed(() => formError.value || oauthError.value)

watch(() => [state.email, state.password], () => {
  wrongCredentials.value = false
})

async function onSubmit(event: FormSubmitEvent<SignInInput>) {
  formError.value = ''
  wrongCredentials.value = false
  if (!captcha.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu'
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
    if (error.code === 'INVALID_EMAIL_OR_PASSWORD') {
      wrongCredentials.value = true
    } else {
      formError.value = authErrorMessage(error)
    }
    return
  }
  await auth.refresh()
  clearNuxtState('me')
  await navigateTo(redirectTo.value)
}

async function signInWithGoogle() {
  formError.value = ''
  const { error } = await client.signIn.social({ provider: 'google', callbackURL: redirectTo.value, errorCallbackURL: '/login' })
  if (error) {
    formError.value = authErrorMessage(error)
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AuthHeader
      title="Masuk ke RuangKerja"
      description="Pakai email yang kamu daftarkan."
    />

    <UAlert
      v-if="wrongCredentials"
      color="error"
      variant="subtle"
      icon="i-ctm-alert-circle"
      title="Email atau kata sandi salah"
      description="Periksa lagi, atau atur ulang kata sandi lewat tautan Lupa kata sandi."
      role="alert"
    />
    <UAlert
      v-else-if="errorText"
      color="error"
      variant="subtle"
      icon="i-ctm-alert-circle"
      :title="errorText"
      role="alert"
    />
    <UAlert
      v-else-if="passwordChanged"
      color="success"
      variant="subtle"
      icon="i-ctm-checkmark-circle"
      title="Kata sandi berhasil diubah"
      description="Masuk dengan kata sandi barumu."
      role="status"
    />

    <UForm
      novalidate
      :schema="signInSchema"
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

      <UFormField
        label="Kata sandi"
        name="password"
        :error="wrongCredentials || undefined"
        :ui="{ labelWrapper: 'justify-between', hint: 'contents' }"
      >
        <template #hint>
          <ULink
            to="/forgot-password"
            class="text-sm/5 font-medium whitespace-nowrap text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Lupa kata sandi?
          </ULink>
        </template>
        <PasswordInput
          v-model="state.password"
          autocomplete="current-password"
          placeholder="Masukkan kata sandi"
        />
      </UFormField>

      <UCheckbox
        v-model="state.remember"
        label="Tetap masuk di perangkat ini"
      />

      <CaptchaField
        ref="captchaField"
        v-model="captcha"
      />

      <UButton
        type="submit"
        size="lg"
        block
        :class="AUTH_BUTTON"
        :loading="loading"
      >
        Masuk
      </UButton>
    </UForm>

    <USeparator label="atau" />

    <UButton
      color="neutral"
      variant="outline"
      size="lg"
      block
      :class="AUTH_BUTTON"
      icon="i-simple-icons-google"
      @click="signInWithGoogle"
    >
      Lanjutkan dengan Google
    </UButton>

    <p class="border-t border-default pt-6 text-center text-sm/5 text-toned">
      Belum punya akun?
      <ULink
        to="/register"
        :class="AUTH_LINK"
      >
        Daftar
      </ULink>
    </p>
  </div>
</template>
