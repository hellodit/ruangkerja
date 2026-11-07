<script setup lang="ts">
/** Shown on every menu until at least one RHK exists (PRD UI implication 1). */
defineProps<{ title?: string, description?: string }>()
</script>

<template>
  <UEmpty
    icon="i-ctm-policy"
    :title="title ?? 'Mulai dari RHK'"
    :description="description ?? 'Semua rencana aksi, progres harian, dan bukti menempel ke RHK. Masukkan RHK dari SKP yang sudah disetujui.'"
    :actions="[{ label: 'Mulai dari RHK', to: '/rhk', icon: 'i-ctm-next-01' }]"
    variant="naked"
    class="py-16"
  />
</template>
