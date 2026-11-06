<script setup lang="ts">
import { UPLOAD_RULES } from '#shared/schemas/upload'

/** Profile photo: presigned upload to R2, verified by the server (magic bytes). */
const toast = useToast()
const auth = useAuthSession()
const { me, refresh } = useMe()
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
    await Promise.all([auth.refresh(), refresh()])
    toast.add({ title: 'Foto profil diperbarui', color: 'success', icon: 'i-lucide-check' })
  } catch (err) {
    toast.add({ title: err instanceof UploadError ? err.message : 'Gagal mengunggah foto', color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <div class="flex items-center gap-4">
    <UAvatar :src="me?.user.image ?? undefined" :alt="me?.user.name" size="3xl" />
    <div class="space-y-2">
      <UButton icon="i-lucide-camera" color="neutral" variant="outline" :loading="uploading" @click="input?.click()">
        {{ uploading ? `Mengunggah… ${progress}%` : 'Ganti foto' }}
      </UButton>
      <p class="text-xs text-muted">
        JPG, PNG, atau WEBP. Maksimal 2 MB.
      </p>
      <input ref="input" type="file" class="hidden" :accept="accept" @change="onChange">
    </div>
  </div>
</template>
