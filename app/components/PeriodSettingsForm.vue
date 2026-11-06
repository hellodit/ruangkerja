<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { skpSchema, type SkpInput } from '#shared/schemas/workspace'

/** ONB-03: SKP year, monthly/quarterly evaluation and submission deadline day. */
const emit = defineEmits<{ saved: [] }>()
const props = defineProps<{ initial?: { year: number, evaluationFrequency: 'monthly' | 'quarterly', submissionDeadlineDay: number } | null, today: string }>()

const notify = useNotify()
const thisYear = Number(props.today.slice(0, 4))
const state = reactive<SkpInput>({
  year: props.initial?.year ?? thisYear,
  evaluationFrequency: props.initial?.evaluationFrequency ?? 'monthly',
  submissionDeadlineDay: props.initial?.submissionDeadlineDay ?? 5
})
const yearItems = [thisYear - 1, thisYear, thisYear + 1].map(y => ({ label: String(y), value: y }))
const dayItems = [3, 5, 7, 10, 15].map(d => ({ label: `Tanggal ${d} bulan berikutnya`, value: d }))

const preview = computed(() => {
  const periods = generatePeriods(state.year, state.evaluationFrequency, state.submissionDeadlineDay)
  const cur = findCurrentPeriod(periods, props.today) ?? periods[0]!
  return cur
})

const saving = ref(false)
async function onSubmit(event: FormSubmitEvent<SkpInput>) {
  saving.value = true
  try {
    await $fetch('/api/skp', { method: 'PUT', body: event.data })
    await refreshNuxtData('skp')
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
  <UForm
    :schema="skpSchema"
    :state="state"
    class="flex flex-col gap-5"
    @submit="onSubmit"
  >
    <div class="grid gap-x-6 gap-y-5 md:grid-cols-3">
      <UFormField
        label="Tahun SKP"
        name="year"
      >
        <USelect
          v-model="state.year"
          :items="yearItems"
        />
      </UFormField>
      <UFormField
        label="Penilaian dilakukan"
        name="evaluationFrequency"
      >
        <URadioGroup
          v-model="state.evaluationFrequency"
          orientation="horizontal"
          class="min-h-8 justify-center"
          :items="[{ label: 'Bulanan', value: 'monthly' }, { label: 'Triwulanan', value: 'quarterly' }]"
        />
      </UFormField>
      <UFormField
        label="Batas pengisian realisasi"
        name="submissionDeadlineDay"
      >
        <USelect
          v-model="state.submissionDeadlineDay"
          :items="dayItems"
        />
      </UFormField>
    </div>
    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="`Periode berjalan: ${preview.label}`"
      :description="`${formatRange(preview.startDate, preview.endDate)} · batas pengisian ${formatDate(preview.submissionDeadline)}`"
    />
    <div class="flex justify-end">
      <UButton
        type="submit"
        :loading="saving"
        color="neutral"
        variant="outline"
      >
        Simpan periode evaluasi
      </UButton>
    </div>
  </UForm>
</template>
