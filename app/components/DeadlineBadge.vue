<script setup lang="ts">
/** BRD-03: countdown to the current period's submission deadline. */
const props = defineProps<{ deadline: string, today: string }>()
const days = computed(() => daysBetween(props.today, props.deadline))
const label = computed(() => {
  const d = days.value
  const when = d > 1 ? `${d} hari lagi` : d === 1 ? 'besok' : d === 0 ? 'hari ini' : `lewat ${-d} hari`
  return `Batas pengisian ${formatDayMonth(props.deadline)} · ${when}`
})
</script>

<template>
  <StatusChip :color="days <= 3 ? 'error' : 'warning'">
    {{ label }}
  </StatusChip>
</template>
