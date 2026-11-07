<template>
  <div class="grid min-h-screen bg-default lg:grid-cols-[1.4fr_1fr]">
    <AuthHero class="hidden lg:flex" />
    <div class="flex min-h-screen flex-col">
      <main class="flex flex-1 items-center justify-center px-4 py-10 sm:px-12">
        <div class="w-full max-w-[380px]">
          <slot />
        </div>
      </main>
      <footer class="px-6 pb-6 text-center">
        <ULink
          to="/privasi"
          class="text-xs text-muted underline underline-offset-2 hover:text-default"
        >
          Kebijakan privasi
        </ULink>
      </footer>
    </div>
  </div>
</template>
