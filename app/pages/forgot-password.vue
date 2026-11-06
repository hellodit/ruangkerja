<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { makeForgotPasswordSchema, type ForgotPasswordInput } from '#shared/schemas/auth'

definePageMeta({ middleware: 'guest' })

const { t } = useI18n()
const localePath = useLocalePath()
const client = useAuthClient()
const errorMessage = useAuthErrorMessage()

useSeoMeta({ title: () => t('auth.forgot.title') })

const schema = computed(() => makeForgotPasswordSchema(t))
const fields = computed<AuthFormField[]>(() => [
  { name: 'email', type: 'email', label: t('auth.fields.email'), placeholder: t('auth.placeholders.email'), autocomplete: 'email', required: true }
])

const captcha = ref('')
const captchaField = useTemplateRef<{ reset: () => void }>('captchaField')
const loading = ref(false)
const formError = ref('')
const sent = ref(false)

async function onSubmit(event: FormSubmitEvent<ForgotPasswordInput>) {
  formError.value = ''
  if (!captcha.value) {
    formError.value = t('validation.captcha')
    return
  }
  loading.value = true
  const { error } = await client.requestPasswordReset({
    email: event.data.email,
    redirectTo: localePath('/reset-password')
  }, {
    headers: { 'x-captcha-response': captcha.value }
  })
  captchaField.value?.reset()
  loading.value = false

  // Errors here never depend on whether the email exists (captcha, rate limit,
  // validation, outage); the success message is identical either way.
  if (error) {
    formError.value = errorMessage(error)
    return
  }
  sent.value = true
}
</script>

<template>
  <AuthCard>
    <div
      v-if="sent"
      class="space-y-6 text-center"
    >
      <UIcon
        name="i-lucide-mail-check"
        class="mx-auto size-10 text-primary"
      />
      <p class="text-muted">
        {{ t('auth.forgot.sent') }}
      </p>
      <UButton
        :to="localePath('/login')"
        color="neutral"
        variant="subtle"
        block
      >
        {{ t('auth.forgot.backToLogin') }}
      </UButton>
    </div>

    <UAuthForm
      v-else
      :schema="schema"
      :fields="fields"
      :title="t('auth.forgot.title')"
      :description="t('auth.forgot.description')"
      icon="i-lucide-key-round"
      :submit="{ label: t('auth.forgot.submit'), block: true }"
      :loading="loading"
      @submit="onSubmit"
    >
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
        <ULink
          :to="localePath('/login')"
          class="text-sm text-primary font-medium"
        >
          {{ t('auth.forgot.backToLogin') }}
        </ULink>
      </template>
    </UAuthForm>
  </AuthCard>
</template>
