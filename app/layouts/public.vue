<template>
  <div class="min-h-screen bg-muted">
    <header class="flex items-center justify-between gap-3 border-b border-default bg-default px-4 py-4 sm:px-8">
      <NuxtLink
        to="/"
        aria-label="Ruang Kerja"
      >
        <AppLogo />
      </NuxtLink>
      <ThemeSwitch />
    </header>
    <main class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <slot />
    </main>
  </div>
</template>
