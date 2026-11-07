<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { PASSWORD_MIN, resetPasswordSchema, type ResetPasswordInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Atur ulang kata sandi', robots: 'noindex' })

const route = useRoute()
const toast = useToast()
const client = useAuthClient()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const invalid = computed(() => !token.value || typeof route.query.error === 'string')
const state = reactive({ password: '', confirmPassword: '' })
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
    class="flex flex-col gap-5"
  >
    <AuthHeader
      title="Tautan tidak berlaku"
      description="Tautan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."
    />
    <UButton
      to="/forgot-password"
      size="lg"
      block
      class="h-12 text-sm/5 font-semibold"
    >
      Minta tautan baru
    </UButton>
  </div>

  <div
    v-else
    class="flex flex-col gap-5"
  >
    <AuthHeader
      title="Atur ulang kata sandi"
      description="Masukkan kata sandi baru Anda."
    />

    <UForm
      novalidate
      :schema="resetPasswordSchema"
      :state="state"
      class="flex flex-col gap-5"
      @submit="onSubmit"
    >
      <UFormField
        label="Kata sandi baru"
        name="password"
        :help="`Minimal ${PASSWORD_MIN} karakter.`"
      >
        <PasswordInput
          v-model="state.password"
          autocomplete="new-password"
          placeholder="Buat kata sandi baru"
        />
      </UFormField>
      <UFormField
        label="Konfirmasi kata sandi"
        name="confirmPassword"
      >
        <PasswordInput
          v-model="state.confirmPassword"
          autocomplete="new-password"
          placeholder="Ulangi kata sandi"
        />
      </UFormField>

      <UAlert
        v-if="formError"
        color="error"
        variant="subtle"
        icon="i-ctm-alert-circle"
        :title="formError"
      />

      <UButton
        type="submit"
        size="lg"
        block
        class="h-12 text-sm/5 font-semibold"
        :loading="loading"
      >
        Simpan kata sandi
      </UButton>
    </UForm>
  </div>
</template>
