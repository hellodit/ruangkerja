<template>
  <UContainer class="flex min-h-[calc(100vh-var(--ui-header-height)-8rem)] items-center justify-center py-12">
    <UPageCard
      class="w-full max-w-md"
      variant="subtle"
    >
      <slot />
    </UPageCard>
  </UContainer>
</template>
