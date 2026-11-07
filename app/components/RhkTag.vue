<script setup lang="ts">
defineProps<{ number: number }>()
</script>

<template>
  <UBadge
    color="neutral"
    variant="soft"
    size="sm"
    class="whitespace-nowrap"
  >
    RHK {{ number }}
  </UBadge>
</template>
