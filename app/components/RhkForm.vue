<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { rhkSchema, type RhkInput } from '#shared/schemas/workspace'

/** ONB-04 / RHK-06: RHK statement, type and indicator rows (IKI). */
const props = defineProps<{ rhkId?: string, initial?: RhkInput, submitLabel?: string, cancelable?: boolean }>()
const emit = defineEmits<{ saved: [id: string], cancel: [] }>()
const notify = useNotify()

type Indicator = RhkInput['indicators'][number]
const blankIndicator = (aspect: Indicator['aspect'] = 'kuantitas'): Indicator => ({ aspect, indicator: '', target: undefined as unknown as number, unit: '' })

const state = reactive<RhkInput>({
  supervisorRhk: props.initial?.supervisorRhk ?? '',
  statement: props.initial?.statement ?? '',
  type: props.initial?.type ?? 'utama',
  indicators: props.initial?.indicators?.length
    ? props.initial.indicators.map(i => ({ ...i }))
    : [blankIndicator('kuantitas'), blankIndicator('kualitas'), blankIndicator('waktu')]
})

const aspects = Object.entries(ASPECT_LABELS).map(([value, label]) => ({ value, label }))
const saving = ref(false)

async function onSubmit(event: FormSubmitEvent<ReturnType<typeof rhkSchema.parse>>) {
  saving.value = true
  try {
    const res = props.rhkId
      ? await $fetch<{ ok: boolean }>(`/api/rhks/${props.rhkId}`, { method: 'PUT', body: event.data }).then(() => ({ id: props.rhkId! }))
      : await $fetch<{ id: string }>('/api/rhks', { method: 'POST', body: event.data })
    await useMe().refresh()
    emit('saved', res.id)
  } catch (err) {
    notify.error(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm
    :schema="rhkSchema"
    :state="state"
    class="flex flex-col gap-5"
    @submit="onSubmit"
  >
    <UFormField
      label="RHK atasan yang diintervensi"
      name="supervisorRhk"
      hint="Opsional"
    >
      <UInput
        v-model="state.supervisorRhk"
        placeholder="Contoh: Meningkatnya kualitas perencanaan pembangunan daerah"
      />
    </UFormField>
    <UFormField
      label="Rencana hasil kerja"
      name="statement"
      required
    >
      <UTextarea
        v-model="state.statement"
        :rows="2"
        autoresize
        placeholder="Contoh: Tersusunnya kajian kebijakan perencanaan pembangunan daerah"
      />
    </UFormField>
    <UFormField
      label="Jenis RHK"
      name="type"
    >
      <URadioGroup
        v-model="state.type"
        orientation="horizontal"
        :items="[{ label: 'Utama', value: 'utama' }, { label: 'Tambahan', value: 'tambahan' }]"
      />
    </UFormField>

    <fieldset class="flex flex-col gap-3">
      <legend class="mb-3">
        <span class="block text-sm font-semibold text-highlighted">Indikator kinerja individu (IKI)</span>
        <span class="block text-sm text-muted">Satu baris untuk tiap indikator, lengkap dengan aspek dan targetnya.</span>
      </legend>
      <UFormField name="indicators" />
      <div class="overflow-x-auto">
        <div class="flex min-w-[600px] flex-col gap-2.5">
          <div
            class="grid grid-cols-[136px_minmax(0,1fr)_96px_136px_40px] gap-2.5 text-xs font-semibold text-muted"
            aria-hidden="true"
          >
            <span>Aspek</span><span>Indikator</span><span>Target</span><span>Satuan</span><span />
          </div>
          <div
            v-for="(row, i) in state.indicators"
            :key="i"
            class="grid grid-cols-[136px_minmax(0,1fr)_96px_136px_40px] items-start gap-2.5"
          >
            <UFormField :name="`indicators.${i}.aspect`">
              <USelect
                v-model="row.aspect"
                :items="aspects"
                :aria-label="`Aspek indikator ${i + 1}`"
              />
            </UFormField>
            <UFormField :name="`indicators.${i}.indicator`">
              <UInput
                v-model="row.indicator"
                :aria-label="`Indikator ${i + 1}`"
                placeholder="Contoh: Jumlah dokumen kajian kebijakan"
              />
            </UFormField>
            <UFormField :name="`indicators.${i}.target`">
              <UInputNumber
                v-model="row.target"
                :min="0"
                :step="1"
                :format-options="{ maximumFractionDigits: 2 }"
                :increment="false"
                :decrement="false"
                :aria-label="`Target indikator ${i + 1}`"
              />
            </UFormField>
            <UFormField :name="`indicators.${i}.unit`">
              <UInput
                v-model="row.unit"
                :aria-label="`Satuan indikator ${i + 1}`"
                placeholder="dokumen"
              />
            </UFormField>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              :aria-label="`Hapus indikator ${i + 1}`"
              :disabled="state.indicators.length === 1"
              @click="state.indicators.splice(i, 1)"
            />
          </div>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        class="self-start"
        :disabled="state.indicators.length >= 10"
        @click="state.indicators.push(blankIndicator())"
      >
        Tambah indikator
      </UButton>
    </fieldset>

    <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-4">
      <UButton
        v-if="cancelable"
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      >
        Batal
      </UButton>
      <UButton
        type="submit"
        :loading="saving"
      >
        {{ submitLabel ?? 'Simpan RHK' }}
      </UButton>
    </div>
  </UForm>
</template>
