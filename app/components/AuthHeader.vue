<script setup lang="ts">
/** Title block of an auth form: 28/36 bold heading and a 15/22 lead. */
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <h1 class="text-[28px]/9 font-bold tracking-[-0.2px] text-highlighted">
      {{ title }}
    </h1>
    <p
      v-if="description || $slots.default"
      class="text-[15px]/[22px] text-toned"
    >
      <slot>{{ description }}</slot>
    </p>
  </div>
</template>
