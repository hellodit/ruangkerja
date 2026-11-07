<!-- Auth layout: form on the right, brand panel on the left; the panel wraps below the form on narrow screens. -->
<template>
  <div class="flex min-h-screen flex-row-reverse flex-wrap bg-default text-highlighted">
    <main class="flex min-w-0 flex-[2_1_560px] items-center justify-center px-4 py-14 sm:px-8">
      <div class="flex w-full max-w-[400px] flex-col gap-6">
        <NuxtLink
          to="/login"
          class="self-start min-[1040px]:hidden"
          aria-label="Ruang Kerja, ke halaman masuk"
        >
          <AppLogo />
        </NuxtLink>
        <slot />
      </div>
    </main>
    <AuthAside />
  </div>
</template>
