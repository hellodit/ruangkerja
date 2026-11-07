<script setup lang="ts">
/** RHK-04: Belum dimulai / Berjalan / Selesai, plus "Lewat tenggat". */
const props = defineProps<{ status: ActionPlanStatus, overdue?: boolean, dueDate?: string, withDate?: boolean }>()

const view = computed(() => {
  if (props.overdue) {
    return { color: 'error' as const, label: props.dueDate ? `Lewat tenggat ${formatDayMonth(props.dueDate)}` : 'Lewat tenggat' }
  }
  const color = props.status === 'selesai' ? 'success' as const : props.status === 'berjalan' ? 'info' as const : 'neutral' as const
  const label = planStatusLabel(props.status)
  return { color, label: props.withDate && props.dueDate && props.status !== 'selesai' ? `${label} · ${formatDayMonth(props.dueDate)}` : label }
})
</script>

<template>
  <StatusChip :color="view.color">
    {{ view.label }}
  </StatusChip>
</template>
