<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { signInSchema, type SignInInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Masuk' })

const route = useRoute()
const auth = useAuthSession()
const client = useAuthClient()

const state = reactive({ email: '', password: '' })
const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')

const redirectTo = computed(() => safeRedirect(route.query.redirect, '/beranda'))

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

async function onSubmit(event: FormSubmitEvent<SignInInput>) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu'
    return
  }
  loading.value = true
  const { error } = await client.signIn.email({
    email: event.data.email,
    password: event.data.password,
    rememberMe: true
  }, { headers: { 'x-captcha-response': captcha.value } })
  captchaField.value?.reset()
  loading.value = false
  if (error) {
    formError.value = authErrorMessage(error)
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
  <div class="flex flex-col gap-5">
    <AuthHeader
      eyebrow="Masuk ke"
      title="Ruang kerja Anda"
    />

    <UForm
      novalidate
      :schema="signInSchema"
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

      <UFormField
        label="Kata sandi"
        name="password"
        :ui="{ labelWrapper: 'justify-between', hint: 'contents' }"
      >
        <template #hint>
          <ULink
            to="/forgot-password"
            class="text-sm/5 font-medium whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
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

      <UAlert
        v-if="errorText"
        color="error"
        variant="subtle"
        icon="i-ctm-alert-circle"
        :title="errorText"
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
        Masuk
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
      @click="signInWithGoogle"
    >
      Lanjutkan dengan Google
    </UButton>

    <p class="text-center text-xs/[18px] text-muted">
      Belum punya akun?
      <ULink
        to="/register"
        class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        Daftar
      </ULink>
    </p>
  </div>
</template>
