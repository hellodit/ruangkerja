<script setup lang="ts">
/**
 * Single-series daily bar chart for the admin dashboard (no chart library):
 * one brand hue, 4px rounded tops on the baseline, 2px gaps, recessive grid,
 * a tooltip per day and a screen-reader table with the same numbers.
 */
const props = defineProps<{
  title: string
  points: { day: string, value: number }[]
  /** Tooltip / table value, e.g. formatRupiah. */
  format: (n: number) => string
  /** Axis value, e.g. formatRupiahCompact. */
  axisFormat?: (n: number) => string
  today: string
}>()

const max = computed(() => niceMax(Math.max(0, ...props.points.map(p => p.value))))
// The middle line only when it is a whole number (counts are never 2,5).
const ticks = computed(() => (Number.isInteger(max.value / 2) ? [max.value, max.value / 2, 0] : [max.value, 0]))
const tickTop = (i: number) => (ticks.value.length === 2 ? i * 100 : i * 50)
const axis = (n: number) => (props.axisFormat ?? props.format)(n)
// Label every n-th day so 7, 30 and 90 days all stay readable.
const every = computed(() => (props.points.length <= 7 ? 1 : props.points.length <= 31 ? 5 : 15))
const showLabel = (i: number) => i === props.points.length - 1 || (i % every.value === 0 && props.points.length - 1 - i >= every.value / 2)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      role="img"
      :aria-label="`${title}, ${points.length} hari`"
      class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3"
    >
      <!-- y axis -->
      <div
        class="relative h-44 text-right text-[11px]/none text-muted tabular-nums"
        aria-hidden="true"
      >
        <!-- invisible copies give the column the width of the widest label -->
        <span
          v-for="(v, i) in ticks"
          :key="`w${i}`"
          class="invisible block h-0 whitespace-nowrap"
        >{{ axis(v) }}</span>
        <span
          v-for="(v, i) in ticks"
          :key="i"
          class="absolute right-0 -translate-y-1/2 whitespace-nowrap"
          :style="{ top: `${tickTop(i)}%` }"
        >{{ axis(v) }}</span>
      </div>
      <!-- plot -->
      <div class="relative h-44">
        <div
          v-for="(v, i) in ticks"
          :key="i"
          class="absolute inset-x-0 border-t"
          :class="v === 0 ? 'border-accented' : 'border-dashed border-default'"
          :style="{ top: `${tickTop(i)}%` }"
          aria-hidden="true"
        />
        <div class="absolute inset-0 flex items-end gap-[2px]">
          <UTooltip
            v-for="p in points"
            :key="p.day"
            :text="`${formatDateShort(p.day)} · ${format(p.value)}`"
            :content="{ side: 'top' }"
          >
            <div
              class="group flex h-full min-w-0 flex-1 cursor-default items-end"
              tabindex="0"
              :aria-label="`${formatDateShort(p.day)}: ${format(p.value)}`"
            >
              <div
                class="w-full rounded-t-[4px] bg-brand-400 transition-colors group-hover:bg-brand-600 group-focus-visible:bg-brand-600"
                :style="{ height: p.value ? `max(2px, ${(p.value / max) * 100}%)` : '0' }"
              />
            </div>
          </UTooltip>
        </div>
      </div>
      <!-- x axis -->
      <div />
      <div
        class="flex gap-[2px] pt-1.5 text-[11px]/none text-muted"
        aria-hidden="true"
      >
        <span
          v-for="(p, i) in points"
          :key="p.day"
          class="relative min-w-0 flex-1"
        >
          <span
            v-if="showLabel(i)"
            class="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
          >{{ formatDayMonth(p.day) }}</span>
        </span>
      </div>
    </div>
    <table class="sr-only">
      <caption>{{ title }}</caption>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Nilai</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in points"
          :key="p.day"
        >
          <td>{{ formatDateShort(p.day) }}</td>
          <td>{{ format(p.value) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
