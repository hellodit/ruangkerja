<script setup lang="ts">
/** Brand panel of the auth pages ("Akun dan pendaftaran" canvas): logo, pitch, three points. */
const points = [
  { icon: 'i-ctm-policy', text: 'Rencana aksi dan progres harian selalu menempel ke RHK.' },
  { icon: 'i-ctm-link', text: 'Tautan bukti dukung tersimpan di satu tempat.' },
  { icon: 'i-ctm-analytics', text: 'Draf realisasi tersusun dari catatanmu sendiri.' }
]
</script>

<template>
  <aside
    aria-label="Tentang RuangKerja"
    class="flex flex-[1_1_480px] flex-col justify-between gap-10 border-r border-brand-100 bg-brand-50 px-6 py-10 sm:px-12 dark:border-[#3a2f12] dark:bg-[#2e2a18]"
  >
    <NuxtLink
      to="/login"
      class="self-start max-[1039px]:hidden"
      aria-label="RuangKerja, ke halaman masuk"
    >
      <AppLogo />
    </NuxtLink>

    <div class="flex max-w-[440px] flex-col gap-7">
      <p class="text-[30px]/[38px] font-bold tracking-[-0.3px] text-highlighted">
        Catat pekerjaan harian. Bahan realisasi terkumpul sendiri.
      </p>
      <ul class="flex flex-col gap-4">
        <li
          v-for="p in points"
          :key="p.icon"
          class="flex items-start gap-3"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-brand-100 bg-default text-brand-ink dark:border-[#3a2f12]">
            <UIcon
              :name="p.icon"
              class="size-5"
            />
          </span>
          <span class="pt-[7px] text-[15px]/[22px] text-highlighted">{{ p.text }}</span>
        </li>
      </ul>
    </div>

    <ULink
      to="/privasi"
      class="self-start text-xs/[18px] text-toned underline underline-offset-2 hover:text-default"
    >
      Kebijakan privasi
    </ULink>
  </aside>
</template>
