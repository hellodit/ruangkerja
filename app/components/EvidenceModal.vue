<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'
import { evidenceSchema } from '#shared/schemas/workspace'

/** BKT: attach a document name + link to a progress entry (no file upload). */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  progressId?: string
  /** Choices when the progress is not fixed (Tambah bukti from the toolbar). */
  options?: { label: string, value: string }[]
}>()
const emit = defineEmits<{ saved: [] }>()
const notify = useNotify()

const formSchema = evidenceSchema.extend({ progressId: z.uuid('Pilih progres harian') })
const state = reactive({ progressId: '', name: '', evidenceUrl: '' })
watch(open, (v) => {
  if (v) {
    Object.assign(state, { progressId: props.progressId ?? '', name: '', evidenceUrl: '' })
  }
})

const saving = ref(false)
async function onSubmit(event: FormSubmitEvent<z.output<typeof formSchema>>) {
  saving.value = true
  try {
    await $fetch('/api/evidence', { method: 'POST', body: event.data })
    notify.success('Bukti dukung ditambahkan')
    open.value = false
    await useMe().refresh()
    emit('saved')
  } catch (err) {
    notify.error(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Tambah bukti dukung"
    description="Simpan nama dokumen dan tautannya. File tetap di Google Drive atau penyimpanan instansi."
  >
    <template #body>
      <UForm
        id="evidence-form"
        :schema="formSchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          v-if="!progressId"
          label="Progres harian"
          name="progressId"
          required
        >
          <USelectMenu
            v-model="state.progressId"
            :items="options ?? []"
            value-key="value"
            placeholder="Pilih progres harian"
          />
        </UFormField>
        <UFormField
          label="Nama dokumen"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="Contoh: Notula rapat koordinasi"
          />
        </UFormField>
        <UFormField
          label="Tautan bukti"
          name="evidenceUrl"
          required
          help="Pastikan tautan bisa dibuka oleh atasan."
        >
          <UInput
            v-model="state.evidenceUrl"
            inputmode="url"
            icon="i-lucide-link"
            placeholder="Tempel tautan Google Drive"
          />
        </UFormField>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="Jangan menautkan dokumen rahasia atau data pribadi warga."
        />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="open = false"
        >
          Batal
        </UButton>
        <UButton
          type="submit"
          form="evidence-form"
          :loading="saving"
        >
          Simpan bukti
        </UButton>
      </div>
    </template>
  </UModal>
</template>
