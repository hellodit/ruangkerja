<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'
import { actionPlanSchema } from '#shared/schemas/workspace'

/** Add / edit one action plan (RHK-03). The unit locks the progress realization unit. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  rhkId: string
  period: { id: string, label: string, startDate: string, endDate: string }
  plan?: { id: string, name: string, target: number, unit: string, dueDate: string } | null
}>()
const emit = defineEmits<{ saved: [] }>()
const notify = useNotify()

const formSchema = actionPlanSchema.omit({ rhkId: true, periodId: true }).extend({
  target: z.number({ error: 'Target wajib berupa angka' }).positive('Target harus lebih dari 0')
})
const state = reactive({ name: '', target: 1, unit: '', dueDate: '' })
watch(open, (v) => {
  if (v) {
    Object.assign(state, props.plan
      ? { name: props.plan.name, target: props.plan.target, unit: props.plan.unit, dueDate: props.plan.dueDate }
      : { name: '', target: 1, unit: '', dueDate: props.period.endDate })
  }
})

const saving = ref(false)
async function onSubmit(event: FormSubmitEvent<z.output<typeof formSchema>>) {
  saving.value = true
  try {
    if (props.plan) {
      await $fetch(`/api/action-plans/${props.plan.id}`, { method: 'PUT', body: event.data })
    } else {
      await $fetch('/api/action-plans', { method: 'POST', body: { ...event.data, rhkId: props.rhkId, periodId: props.period.id } })
    }
    notify.success(props.plan ? 'Rencana aksi diperbarui' : 'Rencana aksi ditambahkan')
    open.value = false
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
    :title="plan ? 'Ubah rencana aksi' : 'Tambah rencana aksi'"
    :description="`${period.label} · ${formatRange(period.startDate, period.endDate)}`"
  >
    <template #body>
      <UForm
        id="action-plan-form"
        :schema="formSchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Nama rencana aksi"
          name="name"
          required
          help="Tugas mendadak dari atasan juga dicatat sebagai rencana aksi di RHK yang relevan."
        >
          <UInput
            v-model="state.name"
            placeholder="Contoh: Rekap data indikator dari OPD"
          />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField
            label="Target periode"
            name="target"
            required
          >
            <UInputNumber
              v-model="state.target"
              :min="0"
              :step="1"
              :format-options="{ maximumFractionDigits: 2 }"
            />
          </UFormField>
          <UFormField
            label="Satuan"
            name="unit"
            required
          >
            <UInput
              v-model="state.unit"
              placeholder="dokumen"
            />
          </UFormField>
          <UFormField
            label="Tenggat"
            name="dueDate"
            required
          >
            <UInput
              v-model="state.dueDate"
              type="date"
            />
          </UFormField>
        </div>
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
          form="action-plan-form"
          :loading="saving"
        >
          {{ plan ? 'Simpan perubahan' : 'Tambah rencana aksi' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
