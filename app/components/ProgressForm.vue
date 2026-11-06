<script setup lang="ts">
import type { FormSubmitEvent, SelectMenuItem } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'
import { PROGRESS_DESCRIPTION_MAX, progressSchema } from '#shared/schemas/workspace'

/** PRG-05..07: add or edit one progres harian, with the action plan side panel. */
const props = defineProps<{
  progressId?: string
  initial?: Partial<ProgressState>
  originalRealization?: number
  today: string
}>()
const emit = defineEmits<{ saved: [mode: 'done' | 'again'] }>()
const notify = useNotify()

interface ProgressState {
  actionPlanId: string
  workDate: string
  startTime: string
  endTime: string
  description: string
  inputMethod: 'typed' | 'voice'
  realization: number
  category: 'biasa' | 'perlu_diskusi'
  marksPlanComplete: boolean
  results: { name: string, evidenceUrl?: string }[]
}

const blank = (): ProgressState => ({
  actionPlanId: '',
  workDate: props.today,
  startTime: '08:00',
  endTime: '09:00',
  description: '',
  inputMethod: 'typed',
  realization: 0,
  category: 'biasa',
  marksPlanComplete: false,
  results: [{ name: '', evidenceUrl: '' }]
})
const state = reactive<ProgressState>({ ...blank(), ...props.initial })

// Plans of the period containing the work date, grouped by RHK.
const { data: planData } = await useFetch('/api/action-plans', { query: computed(() => ({ date: state.workDate })), key: 'plan-options' })
const planItems = computed<SelectMenuItem[][]>(() => (planData.value?.groups ?? []).map(g => [
  { type: 'label', label: `RHK ${g.rhk.number} · ${g.rhk.statement}` },
  ...g.plans.map(p => ({ label: p.name, value: p.id }))
]))
const noPlans = computed(() => !!planData.value && !(planData.value.groups ?? []).length)

type PlanDetail = InternalApi['/api/action-plans/:id']['get']
const plan = ref<PlanDetail | null>(null)
watch(() => state.actionPlanId, async (id) => {
  plan.value = id ? await $fetch<PlanDetail>(`/api/action-plans/${id}`).catch(() => null) : null
}, { immediate: true })

const baseRealization = computed(() => (plan.value ? plan.value.plan.realization - (props.originalRealization ?? 0) : 0))
const afterSave = computed(() => baseRealization.value + (Number(state.realization) || 0))

const speech = useSpeechInput((text) => {
  state.description = [state.description.trim(), text].filter(Boolean).join(' ').slice(0, PROGRESS_DESCRIPTION_MAX)
  state.inputMethod = 'voice'
})

const form = useTemplateRef<{ submit: () => Promise<void> }>('form')
const saving = ref(false)
const next = ref<'done' | 'again'>('done')

async function onSubmit(event: FormSubmitEvent<ReturnType<typeof progressSchema.parse>>) {
  saving.value = true
  try {
    const body = { ...event.data, results: event.data.results.filter(r => r.name.trim()) }
    if (props.progressId) {
      await $fetch(`/api/progress/${props.progressId}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/progress', { method: 'POST', body })
    }
    await useMe().refresh()
    if (next.value === 'again') {
      const keep = { actionPlanId: state.actionPlanId, workDate: state.workDate, startTime: state.endTime, endTime: state.endTime }
      Object.assign(state, blank(), keep)
      plan.value = state.actionPlanId ? await $fetch<PlanDetail>(`/api/action-plans/${state.actionPlanId}`).catch(() => null) : null
    }
    emit('saved', next.value)
  } catch (err) {
    notify.error(err)
  } finally {
    saving.value = false
  }
}

function submit(mode: 'done' | 'again') {
  next.value = mode
  form.value?.submit()
}
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <UForm
      ref="form"
      :schema="progressSchema"
      :state="state"
      class="flex min-w-0 flex-col gap-6"
      @submit="onSubmit"
    >
      <UCard>
        <div class="flex flex-col gap-8">
          <fieldset class="flex flex-col gap-4">
            <legend class="mb-4 text-base font-semibold text-highlighted">
              Pekerjaan
            </legend>
            <UAlert
              v-if="noPlans"
              color="warning"
              variant="subtle"
              icon="i-lucide-list-ordered"
              title="Belum ada rencana aksi di periode tanggal ini"
              description="Susun rencana aksi dulu di detail RHK."
              :actions="[{ label: 'Ke RHK saya', to: '/rhk', color: 'warning', variant: 'outline' }]"
            />
            <UFormField
              label="Rencana aksi"
              name="actionPlanId"
              required
              :help="plan ? `RHK ${plan.rhk.number} · Target ${formatNumber(plan.plan.target)} ${plan.plan.unit} · Tenggat ${formatDayMonth(plan.plan.dueDate)}` : undefined"
            >
              <USelectMenu
                v-model="state.actionPlanId"
                :items="planItems"
                value-key="value"
                placeholder="Pilih rencana aksi"
                :search-input="{ placeholder: 'Cari rencana aksi' }"
              />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-3">
              <UFormField
                label="Tanggal"
                name="workDate"
                required
              >
                <UInput
                  v-model="state.workDate"
                  type="date"
                />
              </UFormField>
              <UFormField
                label="Jam mulai"
                name="startTime"
                required
              >
                <UInput
                  v-model="state.startTime"
                  type="time"
                />
              </UFormField>
              <UFormField
                label="Jam selesai"
                name="endTime"
                required
              >
                <UInput
                  v-model="state.endTime"
                  type="time"
                />
              </UFormField>
            </div>
          </fieldset>

          <fieldset class="flex flex-col gap-3">
            <legend class="mb-4 text-base font-semibold text-highlighted">
              Uraian
            </legend>
            <UFormField
              label="Apa yang kamu kerjakan?"
              name="description"
              required
              :hint="`${state.description.length} / ${PROGRESS_DESCRIPTION_MAX}`"
              help="Tulis apa adanya. Jangan memasukkan data rahasia atau data pribadi warga."
            >
              <UTextarea
                v-model="state.description"
                :rows="3"
                autoresize
                :maxlength="PROGRESS_DESCRIPTION_MAX"
                placeholder="Contoh: Merevisi bagian analisis telaahan sesuai catatan Kasubbag."
              />
            </UFormField>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="speech.supported.value"
                :icon="speech.listening.value ? 'i-lucide-square' : 'i-lucide-mic'"
                :color="speech.listening.value ? 'error' : 'neutral'"
                variant="outline"
                size="sm"
                @click="speech.toggle"
              >
                {{ speech.listening.value ? 'Berhenti merekam' : 'Rekam suara' }}
              </UButton>
              <span
                v-else
                class="text-xs text-muted"
              >Rekam suara tidak didukung browser ini. Gunakan Chrome atau Edge terbaru.</span>
              <span
                v-if="speech.error.value"
                class="text-xs text-error"
              >{{ speech.error.value }}</span>
            </div>
          </fieldset>

          <fieldset class="flex flex-col gap-4">
            <legend class="mb-4 text-base font-semibold text-highlighted">
              Hasil dan bukti
            </legend>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField
                label="Realisasi"
                name="realization"
                required
                help="Jumlah capaian dari pekerjaan ini, 0 bila belum menghasilkan."
              >
                <UInputNumber
                  v-model="state.realization"
                  :min="0"
                  :step="1"
                  :format-options="{ maximumFractionDigits: 2 }"
                />
              </UFormField>
              <UFormField
                label="Satuan"
                help="Mengikuti target rencana aksi."
              >
                <UInput
                  :model-value="plan?.plan.unit ?? '—'"
                  disabled
                />
              </UFormField>
            </div>

            <ProgressResults v-model="state.results" />
          </fieldset>

          <fieldset class="flex flex-col gap-4">
            <legend class="mb-4 text-base font-semibold text-highlighted">
              Status
            </legend>
            <UFormField
              label="Kategori"
              name="category"
            >
              <URadioGroup
                v-model="state.category"
                orientation="horizontal"
                :items="[{ label: 'Biasa', value: 'biasa' }, { label: 'Perlu diskusi dengan atasan', value: 'perlu_diskusi' }]"
              />
            </UFormField>
            <UCheckbox
              v-model="state.marksPlanComplete"
              label="Tandai rencana aksi ini selesai"
            />
          </fieldset>
        </div>
      </UCard>

      <div class="flex flex-wrap justify-end gap-2">
        <slot name="actions" />
        <UButton
          to="/progres"
          color="neutral"
          variant="ghost"
        >
          Batal
        </UButton>
        <UButton
          v-if="!progressId"
          color="neutral"
          variant="outline"
          :loading="saving && next === 'again'"
          @click="submit('again')"
        >
          Simpan dan tambah lagi
        </UButton>
        <UButton
          :loading="saving && next === 'done'"
          @click="submit('done')"
        >
          {{ progressId ? 'Simpan perubahan' : 'Simpan progres' }}
        </UButton>
      </div>
    </UForm>

    <aside class="flex flex-col gap-6 lg:sticky lg:top-4">
      <UCard v-if="plan">
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <RhkTag :number="plan.rhk.number" />
            <UBadge
              v-if="plan.plan.overdue"
              color="warning"
              variant="subtle"
            >
              Lewat tenggat {{ daysBetween(plan.plan.dueDate, today) }} hari
            </UBadge>
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">
              {{ plan.plan.name }}
            </h2>
            <p class="text-sm text-muted">
              Bagian dari RHK: {{ plan.rhk.statement }}
            </p>
          </div>
          <dl class="grid grid-cols-[80px_minmax(0,1fr)] gap-y-1.5 text-sm">
            <dt class="text-muted">
              Target
            </dt><dd>{{ formatNumber(plan.plan.target) }} {{ plan.plan.unit }}</dd>
            <dt class="text-muted">
              Tenggat
            </dt><dd>{{ formatDateLong(plan.plan.dueDate) }}</dd>
            <dt class="text-muted">
              Periode
            </dt><dd>{{ plan.period ? periodShortLabel(plan.period) : '—' }}</dd>
          </dl>
          <div class="flex flex-col gap-1.5">
            <p class="text-sm text-muted">
              Realisasi saat ini <span class="font-semibold text-highlighted">{{ formatNumber(baseRealization) }}</span> dari {{ formatNumber(plan.plan.target) }} {{ plan.plan.unit }}
            </p>
            <UProgress
              :model-value="achievementPercent(baseRealization, plan.plan.target)"
              size="sm"
              aria-label="Realisasi saat ini"
            />
          </div>
          <UAlert
            color="neutral"
            variant="subtle"
            icon="i-lucide-info"
            title="Setelah progres ini disimpan:"
            :description="`${formatNumber(afterSave)} dari ${formatNumber(plan.plan.target)} ${plan.plan.unit} (${achievementPercent(afterSave, plan.plan.target)}%)`"
          />
        </div>
      </UCard>
      <UCard v-if="plan">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold text-highlighted">
              Progres sebelumnya
            </h2>
            <span class="text-xs text-muted">{{ plan.previous.length }} catatan · {{ formatDuration(plan.previous.reduce((n, p) => n + minutesBetween(p.startTime, p.endTime), 0)) }}</span>
          </div>
        </template>
        <p
          v-if="!plan.previous.length"
          class="text-sm text-muted"
        >
          Belum ada progres untuk rencana aksi ini.
        </p>
        <ul class="flex flex-col gap-4">
          <li
            v-for="p in plan.previous.filter(x => x.id !== progressId).slice(0, 5)"
            :key="p.id"
            class="flex flex-col gap-1"
          >
            <span class="text-xs text-muted">{{ formatDateLong(p.workDate) }} · <span class="font-mono">{{ formatTime(p.startTime) }}–{{ formatTime(p.endTime) }}</span></span>
            <p class="text-sm">
              {{ p.description }}
            </p>
            <span class="text-xs text-muted">Realisasi {{ formatNumber(p.realization) }} · {{ p.evidenceCount }} bukti</span>
          </li>
        </ul>
        <template #footer>
          <ULink
            :to="`/rhk/${plan.rhk.id}`"
            class="text-sm font-medium text-info"
          >
            Lihat rencana aksi lengkap
          </ULink>
        </template>
      </UCard>
      <UCard v-if="!plan">
        <p class="text-sm text-muted">
          Pilih rencana aksi untuk melihat target, tenggat, dan progres sebelumnya.
        </p>
      </UCard>
    </aside>
  </div>
</template>
