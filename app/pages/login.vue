<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { makeSignInSchema, type SignInInput } from '#shared/schemas/auth'

definePageMeta({ middleware: 'guest' })

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthSession()
const client = useAuthClient()
const errorMessage = useAuthErrorMessage()

useSeoMeta({ title: () => t('auth.login.title') })

const schema = computed(() => makeSignInSchema(t))
const fields = computed<AuthFormField[]>(() => [
  { name: 'email', type: 'email', label: t('auth.fields.email'), placeholder: t('auth.placeholders.email'), autocomplete: 'email', required: true },
  { name: 'password', type: 'password', label: t('auth.fields.password'), placeholder: t('auth.placeholders.password'), autocomplete: 'current-password', required: true },
  { name: 'remember', type: 'checkbox', label: t('auth.fields.remember'), defaultValue: true }
])

const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')

const redirectTo = computed(() => safeRedirect(route.query.redirect, localePath('/profile')))

// Errors returned by the Google OAuth callback (?error=...)
const oauthError = computed(() => {
  const err = route.query.error
  if (typeof err !== 'string' || !err) {
    return ''
  }
  return err.replace(/\s+/g, '_').toLowerCase() === 'account_not_linked'
    ? t('auth.errors.account_not_linked')
    : t('auth.errors.oauth')
})

async function onSubmit(event: FormSubmitEvent<SignInInput>) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = t('validation.captcha')
    return
  }
  loading.value = true
  const { error } = await client.signIn.email({
    email: event.data.email,
    password: event.data.password,
    rememberMe: event.data.remember ?? true
  }, {
    headers: { 'x-captcha-response': captcha.value }
  })
  captchaField.value?.reset()
  loading.value = false

  if (error) {
    formError.value = errorMessage(error)
    return
  }
  await auth.refresh()
  await navigateTo(redirectTo.value)
}

async function signInWithGoogle() {
  formError.value = ''
  const { error } = await client.signIn.social({
    provider: 'google',
    callbackURL: redirectTo.value,
    errorCallbackURL: localePath('/login')
  })
  if (error) {
    formError.value = errorMessage(error)
  }
}
</script>

<template>
  <AuthCard>
    <UAuthForm
      :schema="schema"
      :fields="fields"
      :title="t('auth.login.title')"
      icon="i-lucide-lock"
      :providers="[{ label: t('auth.google'), icon: 'i-simple-icons-google', color: 'neutral', variant: 'subtle', block: true, onClick: signInWithGoogle }]"
      :separator="t('common.or')"
      :submit="{ label: t('auth.login.submit'), block: true }"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #description>
        {{ t('auth.login.description') }}
        <ULink
          :to="localePath('/register')"
          class="font-medium text-primary"
        >
          {{ t('auth.login.registerLink') }}
        </ULink>
      </template>

      <template #password-hint>
        <ULink
          :to="localePath('/forgot-password')"
          class="text-primary font-medium"
          tabindex="-1"
        >
          {{ t('auth.login.forgot') }}
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
  </AuthCard>
</template>
