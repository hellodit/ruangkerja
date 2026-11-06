<script setup lang="ts">
import { UPLOAD_RULES } from '#shared/schemas/upload'

const { t } = useI18n()
const toast = useToast()
const auth = useAuthSession()
const { upload, uploading, progress } = useR2Upload()
const input = useTemplateRef<HTMLInputElement>('input')

const accept = UPLOAD_RULES.avatar.mimeTypes.join(',')

async function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }
  try {
    await upload('avatar', file)
    await auth.refresh()
    toast.add({ title: t('profile.photo.saved'), color: 'success', icon: 'i-lucide-check' })
  } catch (err) {
    toast.add({ title: t(err instanceof UploadError ? err.message : 'upload.failed'), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <div class="flex items-center gap-4">
    <UAvatar
      :src="auth.user.value?.image ?? undefined"
      :alt="auth.user.value?.name"
      size="3xl"
    />
    <div class="space-y-2">
      <UButton
        icon="i-lucide-camera"
        color="neutral"
        variant="subtle"
        :loading="uploading"
        @click="input?.click()"
      >
        {{ uploading ? `${t('upload.uploading')} ${progress}%` : t('profile.photo.change') }}
      </UButton>
      <p class="text-xs text-muted">
        {{ t('profile.photo.description') }}
      </p>
      <input
        ref="input"
        type="file"
        class="hidden"
        :accept="accept"
        @change="onChange"
      >
    </div>
  </div>
</template>
