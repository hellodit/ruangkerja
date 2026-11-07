<script setup lang="ts">
/** Heading block of the auth form (CTM login screen): wordmark, eyebrow, 32/40 title, optional lead. */
defineProps<{ eyebrow?: string, title: string, description?: string }>()
</script>

<template>
  <div class="flex flex-col gap-5">
    <NuxtLink
      to="/login"
      aria-label="RuangKerja, ke halaman masuk"
      class="self-start"
    >
      <span class="flex items-center gap-2.5">
        <span
          class="flex size-9 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold tracking-tight text-ink"
          aria-hidden="true"
        >rk</span>
        <span class="text-[28px]/9 font-bold text-highlighted">RuangKerja</span>
      </span>
    </NuxtLink>
    <div>
      <p
        v-if="eyebrow"
        class="text-sm/5 font-medium text-toned"
      >
        {{ eyebrow }}
      </p>
      <h1 class="mt-1 text-[32px]/10 font-bold tracking-[-0.2px] text-highlighted">
        {{ title }}
      </h1>
      <p
        v-if="description || $slots.default"
        class="mt-2 text-sm/5 text-toned"
      >
        <slot>{{ description }}</slot>
      </p>
    </div>
  </div>
</template>
