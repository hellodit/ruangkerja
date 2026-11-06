<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { makeResetPasswordSchema, type ResetPasswordInput } from '#shared/schemas/auth'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const toast = useToast()
const client = useAuthClient()
const errorMessage = useAuthErrorMessage()

useSeoMeta({ title: () => t('auth.reset.title'), robots: 'noindex' })

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const invalid = computed(() => !token.value || typeof route.query.error === 'string')

const schema = computed(() => makeResetPasswordSchema(t))
const fields = computed<AuthFormField[]>(() => [
  { name: 'password', type: 'password', label: t('auth.fields.newPassword'), autocomplete: 'new-password', required: true },
  { name: 'confirmPassword', type: 'password', label: t('auth.fields.confirmPassword'), autocomplete: 'new-password', required: true }
])

const loading = ref(false)
const formError = ref('')

async function onSubmit(event: FormSubmitEvent<ResetPasswordInput>) {
  formError.value = ''
  loading.value = true
  const { error } = await client.resetPassword({ newPassword: event.data.password, token: token.value })
  loading.value = false
  if (error) {
    formError.value = errorMessage(error)
    return
  }
  toast.add({ title: t('auth.reset.success'), color: 'success', icon: 'i-lucide-check' })
  await navigateTo(localePath('/login'))
}
</script>

<template>
  <AuthCard>
    <div
      v-if="invalid"
      class="space-y-6 text-center"
    >
      <UIcon
        name="i-lucide-link-2-off"
        class="mx-auto size-10 text-error"
      />
      <p class="text-muted">
        {{ t('auth.reset.invalid') }}
      </p>
      <UButton
        :to="localePath('/forgot-password')"
        block
      >
        {{ t('auth.reset.requestNew') }}
      </UButton>
    </div>

    <UAuthForm
      v-else
      :schema="schema"
      :fields="fields"
      :title="t('auth.reset.title')"
      :description="t('auth.reset.description')"
      icon="i-lucide-key-round"
      :submit="{ label: t('auth.reset.submit'), block: true }"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #validation>
        <UAlert
          v-if="formError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="formError"
        />
      </template>
    </UAuthForm>
  </AuthCard>
</template>
