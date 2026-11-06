<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { type ChangePasswordInput, makeChangePasswordSchema, makeUpdateProfileSchema, type UpdateProfileInput } from '#shared/schemas/profile'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const auth = useAuthSession()
const client = useAuthClient()
const errorMessage = useAuthErrorMessage()

useSeoMeta({ title: () => t('profile.editTitle'), robots: 'noindex' })

// --- Name -------------------------------------------------------------------
const profileSchema = computed(() => makeUpdateProfileSchema(t))
const profileState = reactive({ name: auth.user.value?.name ?? '' })
const savingProfile = ref(false)

async function saveProfile(event: FormSubmitEvent<UpdateProfileInput>) {
  savingProfile.value = true
  const { error } = await client.updateUser({ name: event.data.name })
  savingProfile.value = false
  if (error) {
    toast.add({ title: errorMessage(error), color: 'error' })
    return
  }
  await auth.refresh()
  toast.add({ title: t('profile.info.saved'), color: 'success', icon: 'i-lucide-check' })
}

// --- Password ---------------------------------------------------------------
const { data: hasPassword } = await useAsyncData('auth:has-password', async () => {
  if (import.meta.server) {
    const accounts = await useRequestFetch()<Array<{ providerId: string }>>('/api/auth/list-accounts')
    return accounts.some(a => a.providerId === 'credential')
  }
  const { data } = await client.listAccounts()
  return (data ?? []).some(a => a.providerId === 'credential')
}, { default: () => false })

const passwordSchema = computed(() => makeChangePasswordSchema(t))
const passwordState = reactive({ currentPassword: '', newPassword: '', confirmPassword: '', revokeOtherSessions: true })
const savingPassword = ref(false)

async function savePassword(event: FormSubmitEvent<ChangePasswordInput>) {
  savingPassword.value = true
  const { error } = await client.changePassword({
    currentPassword: event.data.currentPassword,
    newPassword: event.data.newPassword,
    revokeOtherSessions: event.data.revokeOtherSessions ?? true
  })
  savingPassword.value = false
  if (error) {
    toast.add({ title: errorMessage(error), color: 'error' })
    return
  }
  Object.assign(passwordState, { currentPassword: '', newPassword: '', confirmPassword: '' })
  toast.add({ title: t('profile.password.saved'), color: 'success', icon: 'i-lucide-check' })
}
</script>

<template>
  <UContainer class="max-w-3xl space-y-6 py-10">
    <div class="flex items-center gap-3">
      <UButton
        :to="localePath('/profile')"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        :aria-label="t('common.back')"
      />
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('profile.editTitle') }}
      </h1>
    </div>

    <UPageCard
      :title="t('profile.photo.title')"
      variant="subtle"
    >
      <AvatarUploader />
    </UPageCard>

    <UPageCard
      :title="t('profile.info.title')"
      :description="t('profile.info.description')"
      variant="subtle"
    >
      <UForm
        :schema="profileSchema"
        :state="profileState"
        class="space-y-4"
        @submit="saveProfile"
      >
        <UFormField
          :label="t('auth.fields.name')"
          name="name"
          required
        >
          <UInput
            v-model="profileState.name"
            autocomplete="name"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('auth.fields.email')"
          name="email"
        >
          <UInput
            :model-value="auth.user.value?.email"
            disabled
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          :loading="savingProfile"
        >
          {{ t('common.save') }}
        </UButton>
      </UForm>
    </UPageCard>

    <UPageCard
      :title="t('profile.password.title')"
      :description="t('profile.password.description')"
      variant="subtle"
    >
      <UForm
        v-if="hasPassword"
        :schema="passwordSchema"
        :state="passwordState"
        class="space-y-4"
        @submit="savePassword"
      >
        <UFormField
          :label="t('auth.fields.currentPassword')"
          name="currentPassword"
          required
        >
          <UInput
            v-model="passwordState.currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('auth.fields.newPassword')"
          name="newPassword"
          required
        >
          <UInput
            v-model="passwordState.newPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('auth.fields.confirmPassword')"
          name="confirmPassword"
          required
        >
          <UInput
            v-model="passwordState.confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <UCheckbox
          v-model="passwordState.revokeOtherSessions"
          :label="t('profile.password.revokeOthers')"
        />
        <UButton
          type="submit"
          :loading="savingPassword"
        >
          {{ t('common.save') }}
        </UButton>
      </UForm>
      <UAlert
        v-else
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        :title="t('profile.password.googleOnly')"
      />
    </UPageCard>
  </UContainer>
</template>
