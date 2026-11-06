<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { makeSignUpSchema, type SignUpInput } from '#shared/schemas/auth'

definePageMeta({ middleware: 'guest' })

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const auth = useAuthSession()
const client = useAuthClient()
const errorMessage = useAuthErrorMessage()

useSeoMeta({ title: () => t('auth.register.title') })

const schema = computed(() => makeSignUpSchema(t))
const fields = computed<AuthFormField[]>(() => [
  { name: 'name', type: 'text', label: t('auth.fields.name'), placeholder: t('auth.placeholders.name'), autocomplete: 'name', required: true },
  { name: 'email', type: 'email', label: t('auth.fields.email'), placeholder: t('auth.placeholders.email'), autocomplete: 'email', required: true },
  { name: 'password', type: 'password', label: t('auth.fields.password'), autocomplete: 'new-password', required: true },
  { name: 'confirmPassword', type: 'password', label: t('auth.fields.confirmPassword'), autocomplete: 'new-password', required: true }
])

const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')

async function onSubmit(event: FormSubmitEvent<SignUpInput>) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = t('validation.captcha')
    return
  }
  loading.value = true
  const { error } = await client.signUp.email({
    name: event.data.name,
    email: event.data.email,
    password: event.data.password,
    callbackURL: localePath('/verify-email')
  }, {
    headers: { 'x-captcha-response': captcha.value }
  })
  captchaField.value?.reset()
  loading.value = false

  if (error) {
    formError.value = errorMessage(error)
    return
  }
  toast.add({ title: t('auth.register.success'), color: 'success', icon: 'i-lucide-mail-check' })
  await auth.refresh()
  await navigateTo(localePath(auth.loggedIn.value ? '/profile' : '/login'))
}

async function signUpWithGoogle() {
  formError.value = ''
  const { error } = await client.signIn.social({
    provider: 'google',
    callbackURL: localePath('/profile'),
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
      :title="t('auth.register.title')"
      icon="i-lucide-user-plus"
      :providers="[{ label: t('auth.google'), icon: 'i-simple-icons-google', color: 'neutral', variant: 'subtle', block: true, onClick: signUpWithGoogle }]"
      :separator="t('common.or')"
      :submit="{ label: t('auth.register.submit'), block: true }"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #description>
        {{ t('auth.register.description') }}
        <ULink
          :to="localePath('/login')"
          class="font-medium text-primary"
        >
          {{ t('auth.register.loginLink') }}
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
    </UAuthForm>
  </AuthCard>
</template>
