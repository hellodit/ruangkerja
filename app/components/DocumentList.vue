<script setup lang="ts">
import { UPLOAD_RULES } from '#shared/schemas/upload'

const { t, locale } = useI18n()
const toast = useToast()
const { upload, uploading, progress } = useR2Upload()

const { data: documents, refresh } = await useFetch<UploadedDocument[]>('/api/documents', { default: () => [] })

const file = ref<File | null>(null)
const pendingDelete = ref<UploadedDocument | null>(null)
const deleting = ref(false)
const deleteOpen = computed({
  get: () => !!pendingDelete.value,
  set: (v) => {
    if (!v) {
      pendingDelete.value = null
    }
  }
})

watch(file, async (selected) => {
  if (!selected) {
    return
  }
  try {
    await upload('document', selected)
    toast.add({ title: t('documents.uploaded'), color: 'success', icon: 'i-lucide-check' })
    await refresh()
  } catch (err) {
    toast.add({ title: t(err instanceof UploadError ? err.message : 'upload.failed'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    file.value = null
  }
})

async function download(doc: UploadedDocument) {
  try {
    const { url } = await $fetch<{ url: string }>(`/api/documents/${doc.id}/download`)
    window.location.assign(url)
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}

async function confirmDelete() {
  const doc = pendingDelete.value
  if (!doc) {
    return
  }
  deleting.value = true
  try {
    await $fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    toast.add({ title: t('documents.deleted'), color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    deleting.value = false
    pendingDelete.value = null
  }
}

const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }))
const iconFor = (type: string) => (type === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-file-image')
</script>

<template>
  <UPageCard
    :title="t('documents.title')"
    :description="t('documents.description')"
    variant="subtle"
  >
    <UFileUpload
      v-model="file"
      :accept="UPLOAD_RULES.document.mimeTypes.join(',')"
      :label="uploading ? `${t('upload.uploading')} ${progress}%` : t('documents.drop')"
      icon="i-lucide-upload"
      :disabled="uploading"
      class="min-h-32 w-full"
    />

    <p
      v-if="!documents.length"
      class="py-4 text-center text-sm text-muted"
    >
      {{ t('documents.empty') }}
    </p>

    <ul
      v-else
      class="divide-y divide-default"
    >
      <li
        v-for="doc in documents"
        :key="doc.id"
        class="flex items-center gap-3 py-3"
      >
        <UIcon
          :name="iconFor(doc.contentType)"
          class="size-5 shrink-0 text-muted"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ doc.name }}
          </p>
          <p class="text-xs text-muted">
            {{ formatBytes(doc.size) }} · {{ dateFormat.format(new Date(doc.createdAt)) }}
          </p>
        </div>
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          :aria-label="t('common.download')"
          @click="download(doc)"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          :aria-label="t('common.delete')"
          @click="pendingDelete = doc"
        />
      </li>
    </ul>

    <UModal
      v-model:open="deleteOpen"
      :title="t('common.delete')"
    >
      <template #body>
        <p>{{ t('documents.confirmDelete', { name: pendingDelete?.name }) }}</p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="pendingDelete = null"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          >
            {{ t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UPageCard>
</template>
