<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { resetPasswordSchema, type ResetPasswordInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Atur ulang kata sandi', robots: 'noindex' })

const route = useRoute()
const toast = useToast()
const client = useAuthClient()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const invalid = computed(() => !token.value || typeof route.query.error === 'string')
const fields: AuthFormField[] = [
  { name: 'password', type: 'password', label: 'Kata sandi baru', autocomplete: 'new-password', required: true },
  { name: 'confirmPassword', type: 'password', label: 'Konfirmasi kata sandi', autocomplete: 'new-password', required: true }
]
const loading = ref(false)
const formError = ref('')

async function onSubmit(event: FormSubmitEvent<ResetPasswordInput>) {
  formError.value = ''
  loading.value = true
  const { error } = await client.resetPassword({ newPassword: event.data.password, token: token.value })
  loading.value = false
  if (error) {
    formError.value = authErrorMessage(error)
    return
  }
  toast.add({ title: 'Kata sandi berhasil diubah', description: 'Silakan masuk dengan kata sandi baru.', color: 'success' })
  await navigateTo('/login')
}
</script>

<template>
  <div
    v-if="invalid"
    class="space-y-5 text-center"
  >
    <UIcon
      name="i-lucide-link-2-off"
      class="mx-auto size-10 text-error"
    />
    <p class="text-muted">
      Tautan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.
    </p>
    <UButton
      to="/forgot-password"
      block
    >
      Minta tautan baru
    </UButton>
  </div>
  <UAuthForm
    v-else
    :schema="resetPasswordSchema"
    :fields="fields"
    title="Atur ulang kata sandi"
    description="Masukkan kata sandi baru Anda."
    :submit="{ label: 'Simpan kata sandi', block: true }"
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
</template>
