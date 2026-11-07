<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { PASSWORD_MIN, signUpSchema, type SignUpInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Daftar' })

const auth = useAuthSession()
const client = useAuthClient()
const toast = useToast()

const state = reactive({ name: '', email: '', password: '', agree: false })
const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')
/** The email already has an account: red field with links to sign in or reset. */
const emailTaken = ref(false)

watch(() => state.email, () => {
  emailTaken.value = false
})

async function onSubmit(event: FormSubmitEvent<SignUpInput>) {
  formError.value = ''
  emailTaken.value = false
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
    if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
      emailTaken.value = true
    } else {
      formError.value = authErrorMessage(error)
    }
    return
  }
  toast.add({ title: 'Akun berhasil dibuat', description: 'Tautan verifikasi sudah dikirim ke emailmu.', color: 'success', icon: 'i-ctm-email-notification' })
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
  <div class="flex flex-col gap-6">
    <AuthHeader
      title="Buat akun"
      description="Satu akun untuk satu ruang kerja pribadi. Setelah daftar, kamu menyiapkan profil dan RHK."
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
      :schema="signUpSchema"
      :state="state"
      class="flex flex-col gap-4"
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
        help="Dipakai untuk masuk dan menerima tautan verifikasi."
        :error="emailTaken || undefined"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="nama@instansi.go.id"
          class="w-full"
        />
        <template
          v-if="emailTaken"
          #error
        >
          Email ini sudah terdaftar.
          <ULink
            to="/login"
            :class="AUTH_LINK"
          >Masuk</ULink>
          atau
          <ULink
            to="/forgot-password"
            :class="AUTH_LINK"
          >atur ulang kata sandi</ULink>.
        </template>
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

      <UFormField name="agree">
        <UCheckbox
          v-model="state.agree"
          :ui="{ wrapper: 'text-sm/5' }"
        >
          <template #label>
            Saya menyetujui
            <ULink
              to="/privasi"
              target="_blank"
              :class="AUTH_LINK"
            >Kebijakan privasi</ULink>.
          </template>
        </UCheckbox>
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
        :disabled="!state.agree"
        :loading="loading"
      >
        Buat akun
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
      @click="signUpWithGoogle"
    >
      Daftar dengan Google
    </UButton>
    <p class="-mt-3 text-center text-xs/[18px] text-muted">
      Daftar lewat Google berarti kamu menyetujui
      <ULink
        to="/privasi"
        target="_blank"
        :class="AUTH_LINK"
      >Kebijakan privasi</ULink>.
    </p>

    <p class="border-t border-default pt-6 text-center text-sm/5 text-toned">
      Sudah punya akun?
      <ULink
        to="/login"
        :class="AUTH_LINK"
      >
        Masuk
      </ULink>
    </p>
  </div>
</template>
