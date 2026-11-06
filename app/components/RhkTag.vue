<script setup lang="ts">
defineProps<{ number: number }>()
</script>

<template>
  <UBadge color="neutral" variant="outline" size="sm" class="whitespace-nowrap font-semibold">
    RHK {{ number }}
  </UBadge>
</template>
