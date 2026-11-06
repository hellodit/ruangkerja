<script setup lang="ts">
/** Shown on every menu until at least one RHK exists (PRD UI implication 1). */
defineProps<{ title?: string, description?: string }>()
</script>

<template>
  <UEmpty
    icon="i-lucide-target"
    :title="title ?? 'Mulai dari RHK'"
    :description="description ?? 'Semua rencana aksi, progres harian, dan bukti menempel ke RHK. Masukkan RHK dari SKP yang sudah disetujui.'"
    :actions="[{ label: 'Mulai dari RHK', to: '/rhk', icon: 'i-lucide-arrow-right' }]"
    variant="naked"
    class="py-16"
  />
</template>
