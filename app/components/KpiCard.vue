<script setup lang="ts">
defineProps<{ label: string, value: string | number, note?: string, icon: string, tone?: 'warning' | 'default', to?: string }>()
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-2 p-5 sm:p-5' }">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm text-toned">{{ label }}</span>
      <UIcon
        :name="icon"
        class="size-5 text-muted"
      />
    </div>
    <span class="text-[32px]/10 font-bold tabular-nums text-highlighted">{{ value }}</span>
    <span
      v-if="note"
      class="text-xs/[18px]"
      :class="tone === 'warning' ? 'text-warning' : 'text-muted'"
    >{{ note }}</span>
  </UCard>
</template>
