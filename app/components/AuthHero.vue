<script setup lang="ts">
/**
 * Brand panel on the left of the auth pages (CTM login screen layout):
 * dark navy, a centred flow diagram — daily inputs on the left, the
 * RuangKerja mark in the middle, outputs on the right — and the wordmark
 * at the bottom. Purely decorative, so hidden from assistive tech.
 */
const sources = [
  { name: 'Progres harian', icon: 'i-ctm-notes', bg: 'bg-[#22c55e] text-white' },
  { name: 'Rencana aksi', icon: 'i-ctm-list-number', bg: 'bg-[#3b82f6] text-white' },
  { name: 'Tautan bukti', icon: 'i-ctm-link', bg: 'bg-[#0ea5e9] text-white' },
  { name: 'Kalender', icon: 'i-ctm-date', bg: 'bg-[#f43f5e] text-white' },
  { name: 'Lampiran', icon: 'i-ctm-attachment', bg: 'bg-white text-[#0f172a]' },
  { name: 'Catatan suara', icon: 'i-ctm-mic', bg: 'bg-[#a855f7] text-white' }
]
const outputs = [
  { name: 'RHK', icon: 'i-ctm-workflow-01' },
  { name: 'Realisasi', icon: 'i-ctm-analytics' },
  { name: 'Word', icon: 'i-ctm-files-01' },
  { name: 'PDF', icon: 'i-ctm-print' },
  { name: 'Rekap', icon: 'i-ctm-dashboard' }
]
const pill = 'absolute whitespace-nowrap rounded-full border border-white/15 bg-[#0f1b3d]/70 px-2.5 py-1 text-[11px]/4 font-medium text-white'
</script>

<template>
  <div
    class="relative flex-col overflow-hidden bg-[#0f172a] px-14 py-12 text-white"
    aria-hidden="true"
  >
    <div class="flex justify-center">
      <span class="border-b-2 border-[#f2dc5d] px-1 py-1.5 text-[11px]/4 font-semibold tracking-[0.18em] text-[#f2dc5d]">
        ALUR KERJA RUANGKERJA
      </span>
    </div>

    <div class="relative mt-6 grid flex-1 grid-cols-[60px_minmax(0,1fr)_60px] items-center">
      <!-- inputs -->
      <div class="relative flex flex-col items-center gap-3.5">
        <span class="absolute top-1/2 -left-8 rotate-180 text-[10px]/[14px] font-semibold tracking-[0.18em] text-white/65 [writing-mode:vertical-rl]">
          SUMBER
        </span>
        <div
          v-for="s in sources"
          :key="s.name"
          class="flex size-11 items-center justify-center rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          :class="s.bg"
        >
          <UIcon
            :name="s.icon"
            class="size-[22px]"
          />
        </div>
        <span class="mt-1 text-xs/4 font-medium whitespace-nowrap text-white/70">Dan lainnya</span>
      </div>

      <!-- mark -->
      <div class="relative flex items-center justify-center">
        <div class="absolute size-[260px] rounded-full bg-[radial-gradient(circle,rgba(32,174,184,0.35)_0%,rgba(32,174,184,0.08)_60%,transparent_75%)]" />
        <div class="absolute size-[180px] rounded-full bg-[radial-gradient(circle,rgba(145,201,100,0.45)_0%,rgba(145,201,100,0)_70%)]" />
        <div class="relative flex size-24 items-center justify-center rounded-[20px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <span class="flex size-14 items-center justify-center rounded-[14px] bg-linear-to-br from-[#efce84] to-[#c4922a] text-2xl font-extrabold tracking-tight text-ink">rk</span>
        </div>
        <span :class="[pill, 'top-[20%] left-[8%]']">Progres harian</span>
        <span :class="[pill, 'top-[25%] right-[12%]']">Draf realisasi</span>
        <span :class="[pill, 'bottom-[28%] left-[14%]']">Bukti terkumpul</span>
        <span :class="[pill, 'right-[8%] bottom-[22%]']">Siap e-Kinerja</span>
      </div>

      <!-- outputs -->
      <div class="relative flex flex-col items-center gap-3.5">
        <span class="absolute top-1/2 -right-9 text-[10px]/[14px] font-semibold tracking-[0.18em] text-white/65 [writing-mode:vertical-rl]">
          HASIL
        </span>
        <div
          v-for="o in outputs"
          :key="o.name"
          class="flex size-14 flex-col items-center justify-center rounded-xl bg-white text-[#ecbd56] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        >
          <UIcon
            :name="o.icon"
            class="size-5"
          />
          <span class="mt-[3px] text-[8px]/[10px] font-semibold tracking-[0.12em] text-[#475569] uppercase">{{ o.name }}</span>
        </div>
      </div>
    </div>

    <div class="mt-6 flex items-center justify-center gap-3">
      <span class="text-[22px]/none font-bold">RuangKerja</span>
      <span class="h-[18px] w-px bg-white/40" />
      <span class="text-sm/5 font-medium">Asisten kerja ASN</span>
    </div>
  </div>
</template>
