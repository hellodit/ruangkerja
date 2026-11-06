<template>
  <div class="flex min-h-screen flex-col bg-muted">
    <header class="px-6 py-5 sm:px-8">
      <NuxtLink to="/login" aria-label="RuangKerja">
        <AppLogo />
      </NuxtLink>
    </header>
    <main class="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
      <UCard class="w-full max-w-md" :ui="{ body: 'p-6 sm:p-8' }">
        <slot />
      </UCard>
    </main>
    <footer class="mx-auto w-full max-w-2xl px-6 pb-6 text-center">
      <AppDisclaimer />
    </footer>
  </div>
</template>
