<script setup lang="ts">
useSeoMeta({ title: 'Beranda' })

const copy = useCopyText()
const { data } = await useFetch('/api/dashboard', { key: 'dashboard' })
const d = computed(() => (data.value && data.value.ready ? data.value : null))

const firstName = computed(() => (data.value?.name ?? '').split(' ')[0])
const attention = computed(() => {
  if (!d.value) {
    return ''
  }
  const parts = []
  if (d.value.plans.overdue) {
    parts.push(`${d.value.plans.overdue} rencana aksi lewat tenggat`)
  }
  if (d.value.evidence.missing) {
    parts.push(`${d.value.evidence.missing} progres belum punya tautan bukti`)
  }
  if (!d.value.plans.total) {
    return 'Belum ada rencana aksi di periode ini. Susun dari halaman RHK saya.'
  }
  return parts.length ? `Ada ${parts.join(' dan ')}.` : 'Semua rencana aksi dan bukti dukung dalam kondisi baik.'
})
const maxDay = computed(() => Math.max(1, ...(d.value?.week.perDay.map(p => p.count) ?? [1])))
const avg = computed(() => d.value && d.value.week.workdaysSoFar ? (d.value.week.count / d.value.week.workdaysSoFar) : 0)
const chartLabel = computed(() => d.value?.week.perDay.map(p => `${DAYS_ID[dayOfWeek(p.date)]} ${p.count}`).join(', ') ?? '')
</script>

<template>
  <UDashboardPanel id="beranda">
    <template #header>
      <UDashboardNavbar title="Beranda">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DeadlineBadge
            v-if="d"
            :deadline="d.period.submissionDeadline"
            :today="d.today"
            class="hidden sm:inline-flex"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <StartFromRhk v-if="!d" />
      <div
        v-else
        class="mx-auto flex w-full max-w-6xl flex-col gap-6"
      >
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold tracking-[1.1px] text-muted uppercase">{{ formatDateLong(d.today) }}</span>
          <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
            Halo, {{ firstName }}
          </h2>
          <p class="text-muted">
            {{ attention }}
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Rencana aksi periode ini"
            icon="i-ctm-list-number"
            :value="d.plans.total"
            :note="`${d.plans.done} selesai · ${d.plans.running} berjalan · ${d.plans.notStarted} belum dimulai`"
          />
          <KpiCard
            label="Progres harian minggu ini"
            icon="i-ctm-notes"
            :value="d.week.count"
            :note="`Tercatat di ${d.week.daysWithEntries} dari ${d.week.workdaysSoFar} hari kerja`"
          />
          <KpiCard
            label="Bukti dukung terkumpul"
            icon="i-ctm-link"
            :value="d.evidence.count"
            :note="d.evidence.missing ? `${d.evidence.missing} progres belum ada tautan` : 'Semua progres punya bukti'"
            :tone="d.evidence.missing ? 'warning' : 'default'"
          />
          <KpiCard
            label="Menuju batas pengisian"
            icon="i-ctm-date"
            :value="`${Math.max(0, d.daysToDeadline)} hari`"
            :note="formatDateLong(d.period.submissionDeadline)"
          />
        </div>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div class="flex min-w-0 flex-col gap-6">
            <UCard>
              <template #header>
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold text-highlighted">
                      Progres harian minggu ini
                    </h3>
                    <p class="text-sm text-muted">
                      {{ formatRange(d.week.start, d.week.end) }} · {{ d.week.count }} catatan · rata-rata {{ formatNumber(Math.round(avg * 10) / 10) }} per hari kerja
                    </p>
                  </div>
                  <UButton
                    to="/progres"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    trailing-icon="i-ctm-chevron-right"
                  >
                    Lihat progres harian
                  </UButton>
                </div>
              </template>
              <div
                role="img"
                :aria-label="`Jumlah progres harian per hari: ${chartLabel}`"
                class="flex flex-col gap-2"
              >
                <div class="grid h-40 grid-cols-5 gap-4 border-b border-default px-2">
                  <div
                    v-for="p in d.week.perDay"
                    :key="p.date"
                    class="flex h-full flex-col items-center justify-end gap-1.5"
                  >
                    <span
                      class="text-xs font-semibold"
                      :class="p.date === d.today ? 'text-highlighted' : 'text-muted'"
                    >{{ p.count }}</span>
                    <div
                      class="w-full max-w-14 rounded-t-md"
                      :class="p.date === d.today ? 'bg-primary' : 'bg-brand-200 dark:bg-brand-800'"
                      :style="{ height: `${Math.max(4, (p.count / maxDay) * 86)}%` }"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-5 gap-4 px-2 text-center text-xs text-muted">
                  <span
                    v-for="p in d.week.perDay"
                    :key="p.date"
                    :class="p.date === d.today && 'font-semibold text-highlighted'"
                  >
                    {{ DAYS_SHORT_ID[dayOfWeek(p.date)] }} {{ Number(p.date.slice(8)) }}<template v-if="p.date === d.today"> · hari ini</template>
                  </span>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-lg font-semibold text-highlighted">
                    Rencana aksi prioritas
                  </h3>
                  <UButton
                    to="/rhk"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    trailing-icon="i-ctm-chevron-right"
                  >
                    Lihat semua
                  </UButton>
                </div>
              </template>
              <p
                v-if="!d.priority.length"
                class="text-sm text-muted"
              >
                Tidak ada rencana aksi terbuka di periode ini.
              </p>
              <ul
                v-else
                class="divide-y divide-default"
              >
                <li
                  v-for="p in d.priority"
                  :key="p.id"
                  class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5"
                >
                  <div class="flex min-w-60 flex-1 flex-col gap-0.5">
                    <NuxtLink
                      :to="`/rhk/${p.rhkId}`"
                      class="text-sm font-semibold text-highlighted hover:underline"
                    >
                      {{ p.name }}
                    </NuxtLink>
                    <span class="text-xs text-muted">RHK {{ p.rhkNumber }} · Realisasi {{ formatNumber(p.realization) }} dari {{ formatNumber(p.target) }} {{ p.unit }}</span>
                  </div>
                  <UProgress
                    :model-value="p.achievement"
                    size="sm"
                    class="w-30"
                    :aria-label="`Realisasi ${p.name}`"
                  />
                  <PlanStatusBadge
                    :status="p.status"
                    :overdue="p.overdue"
                    :due-date="p.dueDate"
                    with-date
                  />
                </li>
              </ul>
            </UCard>
          </div>

          <div class="flex min-w-0 flex-col gap-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-lg font-semibold text-highlighted">
                    Progres hari ini
                  </h3>
                  <span class="text-xs text-muted">{{ d.todayEntries.length }} catatan</span>
                </div>
              </template>
              <div
                v-if="!d.todayEntries.length"
                class="flex flex-col items-start gap-3"
              >
                <p class="text-sm text-muted">
                  Belum ada catatan hari ini.
                </p>
                <UButton
                  to="/progres/tambah"
                  icon="i-ctm-plus"
                  size="sm"
                >
                  Tambah progres
                </UButton>
              </div>
              <ul
                v-else
                class="flex flex-col gap-4"
              >
                <li
                  v-for="e in d.todayEntries"
                  :key="e.id"
                  class="grid grid-cols-[84px_minmax(0,1fr)_auto] gap-3"
                >
                  <span class="font-mono text-xs leading-5 text-muted">{{ formatTime(e.startTime) }}–{{ formatTime(e.endTime) }}</span>
                  <div class="flex flex-col gap-1">
                    <span class="text-sm">{{ e.description }}</span>
                    <span
                      class="text-xs"
                      :class="e.evidenceCount ? 'text-muted' : 'text-warning'"
                    >
                      {{ e.planName }} · {{ e.evidenceCount ? `${e.evidenceCount} bukti` : 'Belum ada bukti' }}
                    </span>
                  </div>
                  <UTooltip text="Salin untuk e-Kinerja">
                    <UButton
                      icon="i-ctm-copy"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      aria-label="Salin untuk e-Kinerja"
                      @click="copy(formatEkinerjaCopy([e.ekinerja]))"
                    />
                  </UTooltip>
                </li>
              </ul>
            </UCard>

            <UCard>
              <template #header>
                <h3 class="text-lg font-semibold text-highlighted">
                  Rencana aksi selesai per RHK
                </h3>
              </template>
              <ul class="flex flex-col gap-5">
                <li
                  v-for="r in d.perRhk"
                  :key="r.id"
                  class="flex flex-col gap-1.5"
                >
                  <div class="flex justify-between gap-2 text-sm">
                    <NuxtLink
                      :to="`/rhk/${r.id}`"
                      class="font-semibold text-highlighted hover:underline"
                    >RHK {{ r.number }}</NuxtLink>
                    <span class="text-muted tabular-nums">{{ r.done }} dari {{ r.total }}</span>
                  </div>
                  <span class="text-xs text-muted">{{ r.statement }}</span>
                  <UProgress
                    :model-value="r.total ? Math.round(r.done / r.total * 100) : 0"
                    size="sm"
                    :aria-label="`RHK ${r.number}`"
                  />
                </li>
              </ul>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
