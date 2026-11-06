<script setup lang="ts">
withDefaults(defineProps<{ subtitle?: boolean, collapsed?: boolean }>(), { subtitle: true, collapsed: false })
</script>

<template>
  <span class="flex items-center gap-2.5">
    <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold tracking-tight text-ink" aria-hidden="true">rk</span>
    <span v-if="!collapsed" class="flex flex-col">
      <span class="text-[15px] leading-5 font-bold text-highlighted">RuangKerja</span>
      <span v-if="subtitle" class="text-xs text-muted">Asisten kerja ASN</span>
    </span>
  </span>
</template>
