<script setup lang="ts">
definePageMeta({ layout: 'onboarding' })
useSeoMeta({ title: 'Ringkasan' })

const notify = useNotify()
const [{ data: profile }, { data: skp }, { data: list }, { data: settings }] = await Promise.all([
  useFetch('/api/profile', { key: 'profile' }),
  useFetch('/api/skp', { key: 'skp' }),
  useFetch('/api/rhks', { key: 'rhks' }),
  useFetch('/api/settings', { key: 'settings' })
])

const rhks = computed(() => list.value?.rhks ?? [])
const indicatorCount = computed(() => rhks.value.reduce((n, r) => n + r.indicators.length, 0))
const reminders = reactive({ remindBeforeDeadline: true, remindDaily: true })
watch(settings, (s) => {
  if (s) {
    reminders.remindBeforeDeadline = s.remindBeforeDeadline
    reminders.remindDaily = s.remindDaily
  }
}, { immediate: true })

const finishing = ref(false)
async function finish(to: string) {
  finishing.value = true
  try {
    await $fetch('/api/settings', { method: 'PATCH', body: reminders })
    await $fetch('/api/onboarding/complete', { method: 'POST' })
    await useMe().refresh()
    await navigateTo(to)
  } catch (err) {
    notify.error(err)
  } finally {
    finishing.value = false
  }
}

const employment = computed(() => {
  const p = profile.value
  if (!p) {
    return ''
  }
  const status = p.employmentStatus ? p.employmentStatus.toUpperCase() : ''
  const rank = p.rankGrade ? p.rankGrade.split(',').pop()?.trim() : ''
  return [p.positionTitle, [status, rank].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
})
const firstRhkId = computed(() => rhks.value[0]?.id)
const steps = [
  { icon: 'i-lucide-list-ordered', title: '1. Susun rencana aksi', text: 'Di awal periode, tentukan rencana aksi untuk tiap RHK.' },
  { icon: 'i-lucide-notebook-pen', title: '2. Catat progres harian', text: 'Tulis apa yang dikerjakan hari itu beserta realisasinya.' },
  { icon: 'i-lucide-link', title: '3. Lengkapi bukti dukung', text: 'Tambahkan tautan bukti untuk tiap progres.' },
  { icon: 'i-lucide-files', title: '4. Susun realisasi', text: 'Di akhir periode, draf realisasi disusun dari progres harian.' }
]
</script>

<template>
  <OnboardingShell :step="3">
    <div class="flex flex-col gap-6">
      <div class="max-w-2xl space-y-2">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted">
          Ringkasan
        </h1>
        <p class="text-muted">
          Periksa lagi sebelum mulai. Semua data masih bisa diubah nanti.
        </p>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              Profil
            </h2>
            <ULink
              to="/onboarding/profil"
              class="text-sm font-medium text-brand-ink"
              aria-label="Ubah profil"
            >
              Ubah
            </ULink>
          </div>
        </template>
        <dl class="grid gap-3 text-sm">
          <div class="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt class="text-muted">
              Nama
            </dt><dd class="text-highlighted">
              {{ profile?.name }}
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt class="text-muted">
              Kontak
            </dt><dd>{{ [profile?.email, profile?.phoneWhatsapp].filter(Boolean).join(' · ') }}</dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt class="text-muted">
              Kepegawaian
            </dt>
            <dd>
              <span class="block">{{ employment || '—' }}</span>
              <span class="block text-muted">{{ [profile?.workUnit, profile?.agency].filter(Boolean).join(', ') }}</span>
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt class="text-muted">
              Atasan langsung
            </dt><dd>{{ [profile?.supervisorName, profile?.supervisorTitle].filter(Boolean).join(' · ') || '—' }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              Periode dan RHK
            </h2>
            <ULink
              to="/onboarding/rhk"
              class="text-sm font-medium text-brand-ink"
              aria-label="Ubah periode dan RHK"
            >
              Ubah
            </ULink>
          </div>
        </template>
        <dl class="grid gap-3 text-sm">
          <div class="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt class="text-muted">
              Periode evaluasi
            </dt>
            <dd v-if="skp?.skp">
              SKP {{ skp.skp.year }} · {{ skp.skp.evaluationFrequency === 'monthly' ? 'Bulanan' : 'Triwulanan' }} · batas pengisian tanggal {{ skp.skp.submissionDeadlineDay }} bulan berikutnya
            </dd>
            <dd
              v-else
              class="text-warning"
            >
              Belum diatur
            </dd>
          </div>
          <div class="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt class="text-muted">
              RHK
            </dt>
            <dd>
              <span class="block font-medium text-highlighted">{{ rhks.length }} RHK · {{ indicatorCount }} indikator</span>
              <ul class="mt-1 list-disc space-y-1 pl-5">
                <li
                  v-for="r in rhks"
                  :key="r.id"
                >
                  {{ r.statement }}
                </li>
              </ul>
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">
            Pengingat
          </h2>
        </template>
        <div class="flex flex-col gap-5">
          <USwitch
            v-model="reminders.remindBeforeDeadline"
            label="Ingatkan sebelum batas pengisian"
            :description="`Dikirim ${settings?.remindDaysBefore ?? 3} hari sebelum batas pengisian realisasi.`"
          />
          <USwitch
            v-model="reminders.remindDaily"
            label="Ingatkan mencatat progres harian"
            :description="`Setiap hari kerja pukul ${formatTime(settings?.remindDailyTime ?? '16:00')}.`"
          />
        </div>
      </UCard>

      <section
        aria-labelledby="al-title"
        class="space-y-3"
      >
        <h2
          id="al-title"
          class="text-lg font-semibold text-highlighted"
        >
          Setelah ini, tiap periode
        </h2>
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="s in steps"
            :key="s.title"
          >
            <UCard class="h-full">
              <UIcon
                :name="s.icon"
                class="mb-3 size-6 text-brand-ink"
              />
              <p class="font-semibold text-highlighted">
                {{ s.title }}
              </p>
              <p class="text-sm text-muted">
                {{ s.text }}
              </p>
            </UCard>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <UButton
        to="/onboarding/rhk"
        color="neutral"
        variant="outline"
        size="lg"
        icon="i-lucide-chevron-left"
      >
        Kembali
      </UButton>
      <span class="flex-1 text-sm text-muted">Langkah 3 dari 3</span>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        :loading="finishing"
        @click="finish('/beranda')"
      >
        Selesai, ke Beranda
      </UButton>
      <UButton
        size="lg"
        :loading="finishing"
        @click="finish(firstRhkId ? `/rhk/${firstRhkId}` : '/rhk')"
      >
        Selesai, susun rencana aksi
      </UButton>
    </template>
  </OnboardingShell>
</template>
