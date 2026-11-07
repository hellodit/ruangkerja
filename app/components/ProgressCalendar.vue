<script setup lang="ts">
import type { InternalApi } from 'nitropack'

type Entry = InternalApi['/api/progress']['get']['entries'][number]

/**
 * PRG-03: work-week calendar, 07.00–17.00, entries placed by time and colored
 * per RHK. 1:1 with the canvas artboard "Tampilan kalender": 56px hours, solid
 * hour lines, today column on bg-brand-subtle, summary footer inside the card.
 */
const props = defineProps<{ entries: Entry[], start: string, today: string, timezone?: string }>()
const tzLabel = computed(() => ({ 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' } as Record<string, string>)[props.timezone ?? ''] ?? 'WIB')
const emit = defineEmits<{ select: [entry: Entry] }>()

const START = 7 * 60
const END = 17 * 60
const HOUR_PX = 56
const hours = Array.from({ length: (END - START) / 60 }, (_, i) => 7 + i)
const days = computed(() => Array.from({ length: 5 }, (_, i) => addDays(props.start, i)))

function place(e: Entry) {
  const s = Math.max(START, Math.min(END - 15, timeToMinutes(e.startTime)))
  const en = Math.max(s + 15, Math.min(END, timeToMinutes(e.endTime)))
  return { top: `${((s - START) / 60) * HOUR_PX + 2}px`, height: `${((en - s) / 60) * HOUR_PX - 4}px` }
}
// Room for the description under the title (canvas shows it on long blocks).
const showDescription = (e: Entry) => minutesBetween(e.startTime, e.endTime) >= 150

function dayInfo(d: string) {
  const list = props.entries.filter(e => e.workDate === d)
  const minutes = list.reduce((n, e) => n + minutesBetween(e.startTime, e.endTime), 0)
  return { list, label: list.length ? `${list.length} catatan · ${formatDuration(minutes)}` : 'Belum ada catatan' }
}

const summary = computed(() => {
  const minutes = props.entries.reduce((n, e) => n + minutesBetween(e.startTime, e.endTime), 0)
  const perRhk = new Map<number, number>()
  for (const e of props.entries) perRhk.set(e.rhk.number, (perRhk.get(e.rhk.number) ?? 0) + 1)
  const parts = [`${props.entries.length} catatan`, formatDuration(minutes), ...[...perRhk].sort((a, b) => a[0] - b[0]).map(([n, c]) => `RHK ${n}: ${c}`)]
  return { text: parts.join(' · '), missing: props.entries.filter(e => !e.hasEvidence).length }
})

function slotLink(d: string, hour: number) {
  return `/progres/tambah?date=${d}&start=${String(hour).padStart(2, '0')}:00`
}
</script>

<template>
  <UCard
    :ui="{ body: 'p-0 sm:p-0' }"
    :aria-label="`Kalender minggu ${formatRange(days[0]!, days[4]!)}`"
  >
    <div class="overflow-x-auto">
      <div class="min-w-[700px]">
        <div class="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] border-b border-default">
          <div class="flex items-end px-2 py-3 text-[11px]/[14px] text-toned">
            {{ tzLabel }}
          </div>
          <div
            v-for="d in days"
            :key="d"
            class="flex flex-col gap-0.5 border-l border-default p-3"
            :class="d === today && 'bg-brand-50 dark:bg-brand-950/40'"
          >
            <span
              v-if="d === today"
              class="text-xs/4 font-semibold text-brand-ink"
            >{{ DAYS_SHORT_ID[dayOfWeek(d)] }} · Hari ini</span>
            <span
              v-else
              class="text-xs/4 text-toned"
            >{{ DAYS_SHORT_ID[dayOfWeek(d)] }}</span>
            <span
              v-if="d === today"
              class="size-8 rounded-full bg-primary text-center text-lg/8 font-bold text-white"
            >{{ Number(d.slice(8)) }}</span>
            <span
              v-else
              class="text-xl/[26px] font-semibold text-highlighted"
            >{{ Number(d.slice(8)) }}</span>
            <span class="text-xs/4 text-toned">{{ dayInfo(d).label }}</span>
          </div>
        </div>

        <div class="grid grid-cols-[64px_repeat(5,minmax(0,1fr))]">
          <div
            class="relative"
            aria-hidden="true"
            :style="{ height: `${hours.length * HOUR_PX}px` }"
          >
            <span
              v-for="(h, i) in hours"
              :key="h"
              class="absolute right-2 text-[11px]/[14px] text-toned"
              :style="{ top: `${i === 0 ? 2 : i * HOUR_PX - 7}px` }"
            >{{ String(h).padStart(2, '0') }}.00</span>
          </div>
          <div
            v-for="d in days"
            :key="d"
            role="list"
            :aria-label="`${formatDateLong(d)}${d === today ? ', hari ini' : ''}`"
            class="relative border-l border-default"
            :class="d === today && 'bg-brand-50 dark:bg-brand-950/40'"
            :style="{ height: `${hours.length * HOUR_PX}px` }"
          >
            <NuxtLink
              v-for="h in hours"
              :key="h"
              :to="slotLink(d, h)"
              class="block border-t border-default hover:bg-elevated/60 focus-visible:bg-elevated focus-visible:outline-none"
              :style="{ height: `${HOUR_PX}px` }"
              :aria-label="`Tambah progres ${formatDateShort(d)} pukul ${String(h).padStart(2, '0')}.00`"
            />
            <button
              v-for="e in dayInfo(d).list"
              :key="e.id"
              type="button"
              role="listitem"
              class="absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-sm border px-2 py-1.5 text-left text-highlighted hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700"
              :class="rhkColor(e.rhk.number).block"
              :style="place(e)"
              :aria-label="`${formatTime(e.startTime)} sampai ${formatTime(e.endTime)}, RHK ${e.rhk.number}, ${e.plan.name}${e.hasEvidence ? '' : ', belum ada bukti'}, buka detail`"
              @click="emit('select', e)"
            >
              <span class="font-mono text-[11px]/[14px] text-toned">{{ formatTime(e.startTime) }}–{{ formatTime(e.endTime) }} · RHK {{ e.rhk.number }}</span>
              <span class="text-xs/4 font-semibold">{{ e.plan.name }}</span>
              <span
                v-if="showDescription(e)"
                class="text-xs/4 text-toned"
              >{{ e.description }}</span>
              <span
                v-if="!e.hasEvidence"
                class="inline-flex items-center gap-1 text-[11px]/[14px] font-semibold text-warning"
              ><UIcon
                name="i-ctm-warning"
                class="size-3.5"
              />Belum ada bukti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-default px-4 py-3 text-[13px]/[18px] text-toned">
      <span class="inline-flex items-center gap-2">
        <UIcon
          name="i-ctm-information"
          class="size-4 shrink-0"
        />Klik catatan untuk melihat detailnya. Klik slot kosong untuk menambah progres pada jam itu.
      </span>
      <span class="ml-auto">{{ summary.text }}<template v-if="summary.missing"> · <span class="text-warning">{{ summary.missing }} belum ada bukti</span></template></span>
    </div>
  </UCard>
</template>
