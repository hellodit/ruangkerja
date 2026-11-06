<script setup lang="ts">
import type { InternalApi } from 'nitropack'

type Entry = InternalApi['/api/progress']['get']['entries'][number]

/** PRG-03: work-week calendar, 07.00–17.00, entries placed by time and colored per RHK. */
const props = defineProps<{ entries: Entry[], start: string, today: string, timezone?: string }>()
const tzLabel = computed(() => ({ 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' } as Record<string, string>)[props.timezone ?? ''] ?? 'WIB')
const emit = defineEmits<{ select: [entry: Entry] }>()

const START = 7 * 60
const END = 17 * 60
const HOUR_PX = 56
const hours = Array.from({ length: (END - START) / 60 + 1 }, (_, i) => 7 + i)
const days = computed(() => Array.from({ length: 5 }, (_, i) => addDays(props.start, i)))

// Fixed palette per RHK number; the RHK label is always written too.
const PALETTE = [
  'bg-brand-100 ring-brand-300 dark:bg-brand-950/60 dark:ring-brand-800',
  'bg-blue-100 ring-blue-300 dark:bg-blue-950/60 dark:ring-blue-800',
  'bg-green-100 ring-green-300 dark:bg-green-950/60 dark:ring-green-800',
  'bg-purple-100 ring-purple-300 dark:bg-purple-950/60 dark:ring-purple-800',
  'bg-orange-100 ring-orange-300 dark:bg-orange-950/60 dark:ring-orange-800',
  'bg-pink-100 ring-pink-300 dark:bg-pink-950/60 dark:ring-pink-800'
]
const colorFor = (n: number) => PALETTE[(n - 1) % PALETTE.length]

function place(e: Entry) {
  const s = Math.max(START, Math.min(END - 15, timeToMinutes(e.startTime)))
  const en = Math.max(s + 15, Math.min(END, timeToMinutes(e.endTime)))
  return { top: `${((s - START) / 60) * HOUR_PX}px`, height: `${((en - s) / 60) * HOUR_PX - 2}px` }
}

function dayInfo(d: string) {
  const list = props.entries.filter(e => e.workDate === d)
  const minutes = list.reduce((n, e) => n + minutesBetween(e.startTime, e.endTime), 0)
  return { list, label: list.length ? `${list.length} catatan · ${formatDuration(minutes)}` : 'Belum ada catatan' }
}

function slotLink(d: string, hour: number) {
  return `/progres/tambah?date=${d}&start=${String(hour).padStart(2, '0')}:00`
}
</script>

<template>
  <UCard
    :ui="{ body: 'p-0 sm:p-0 overflow-x-auto' }"
    :aria-label="`Kalender minggu ${formatRange(days[0]!, days[4]!)}`"
  >
    <div class="min-w-[760px]">
      <div class="sticky top-0 z-10 grid grid-cols-[64px_repeat(5,minmax(0,1fr))] border-b border-default bg-default">
        <div class="flex items-end p-2 text-xs text-muted">
          {{ tzLabel }}
        </div>
        <div
          v-for="d in days"
          :key="d"
          class="border-l border-default p-3"
          :class="d === today && 'bg-brand-50 dark:bg-brand-950/40'"
        >
          <p class="text-xs font-semibold text-muted uppercase">
            {{ DAYS_SHORT_ID[dayOfWeek(d)] }}<template v-if="d === today">
              · Hari ini
            </template>
          </p>
          <p
            class="text-2xl font-bold"
            :class="d === today ? 'text-brand-ink' : 'text-highlighted'"
          >
            {{ Number(d.slice(8)) }}
          </p>
          <p class="text-xs text-muted">
            {{ dayInfo(d).label }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-[64px_repeat(5,minmax(0,1fr))]">
        <div class="relative">
          <div
            v-for="h in hours"
            :key="h"
            class="relative"
            :style="{ height: h === hours.at(-1) ? '0px' : `${HOUR_PX}px` }"
          >
            <span
              class="absolute right-2 font-mono text-[11px] text-muted"
              :class="h === hours[0] ? 'top-0.5' : '-top-2'"
            >{{ String(h).padStart(2, '0') }}.00</span>
          </div>
        </div>
        <div
          v-for="d in days"
          :key="d"
          role="list"
          :aria-label="formatDateLong(d)"
          class="relative border-l border-default"
          :class="d === today && 'bg-brand-50/50 dark:bg-brand-950/20'"
          :style="{ height: `${(hours.length - 1) * HOUR_PX}px` }"
        >
          <NuxtLink
            v-for="h in hours.slice(0, -1)"
            :key="h"
            :to="slotLink(d, h)"
            class="block border-b border-dashed border-default hover:bg-elevated/60 focus-visible:bg-elevated focus-visible:outline-none"
            :style="{ height: `${HOUR_PX}px` }"
            :aria-label="`Tambah progres ${formatDateShort(d)} pukul ${String(h).padStart(2, '0')}.00`"
          />
          <button
            v-for="e in dayInfo(d).list"
            :key="e.id"
            type="button"
            role="listitem"
            class="absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left ring-1 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-info"
            :class="colorFor(e.rhk.number)"
            :style="place(e)"
            :aria-label="`${formatTime(e.startTime)} sampai ${formatTime(e.endTime)}, RHK ${e.rhk.number}, ${e.plan.name}${e.hasEvidence ? '' : ', belum ada bukti'}, buka detail`"
            @click="emit('select', e)"
          >
            <span class="block truncate font-mono text-[11px] text-toned">{{ formatTime(e.startTime) }}–{{ formatTime(e.endTime) }} · RHK {{ e.rhk.number }}</span>
            <span class="block truncate text-xs font-semibold text-highlighted">{{ e.plan.name }}</span>
            <span
              v-if="!e.hasEvidence"
              class="flex items-center gap-1 text-[11px] text-warning"
            ><UIcon
              name="i-lucide-triangle-alert"
              class="size-3"
            />Belum ada bukti</span>
          </button>
        </div>
      </div>
    </div>
  </UCard>
</template>
