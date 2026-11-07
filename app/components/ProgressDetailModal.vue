<script setup lang="ts">
import type { InternalApi } from 'nitropack'

type Entry = InternalApi['/api/progress']['get']['entries'][number]

/** PRG-04: detail dialog for one calendar entry (canvas "Tampilan kalender" dialog). */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ entry: Entry | null }>()
const emit = defineEmits<{ addEvidence: [id: string] }>()
const copy = useCopyText()

const evidence = computed(() => props.entry?.results.filter(r => r.evidenceUrl) ?? [])

async function copyEntry() {
  if (!props.entry) {
    return
  }
  const res = await $fetch<{ text: string }>('/api/progress/copy', { method: 'POST', body: { ids: [props.entry.id] } })
  await copy(res.text)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="entry?.plan.name ?? 'Detail progres'"
    :description="entry ? `${formatDateLong(entry.workDate)} · ${formatTime(entry.startTime)}–${formatTime(entry.endTime)} · ${formatDuration(minutesBetween(entry.startTime, entry.endTime))}` : ''"
    :close="{ size: 'sm', square: true }"
    :ui="{ content: 'sm:max-w-[560px]', wrapper: 'pe-8' }"
  >
    <template #title>
      <span
        v-if="entry"
        class="mb-1.5 flex flex-wrap gap-2 text-sm font-normal"
      >
        <RhkTag :number="entry.rhk.number" />
        <StatusChip
          v-if="!entry.hasEvidence"
          color="warning"
        >
          Belum ada bukti
        </StatusChip>
      </span>
      <span class="block">{{ entry?.plan.name ?? 'Detail progres' }}</span>
    </template>

    <template #body>
      <div
        v-if="entry"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1">
          <span class="text-xs/4 font-semibold text-toned">Uraian</span>
          <p class="text-sm/[22px] text-highlighted">
            {{ entry.description }}
          </p>
        </div>
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm/5">
          <dt class="text-toned">
            Rencana aksi
          </dt>
          <dd class="text-highlighted">
            {{ entry.plan.name }}
          </dd>
          <dt class="text-toned">
            Realisasi
          </dt>
          <dd class="font-semibold text-highlighted">
            {{ formatNumber(entry.realization) }} {{ entry.plan.unit }}
          </dd>
          <dt class="text-toned">
            Kategori
          </dt>
          <dd class="text-highlighted">
            {{ CATEGORY_LABELS[entry.category] }}
          </dd>
        </dl>
        <div
          v-if="evidence.length"
          class="flex flex-col gap-1.5"
        >
          <span class="text-xs/4 font-semibold text-toned">Bukti dukung</span>
          <ULink
            v-for="r in evidence"
            :key="r.id"
            :to="r.evidenceUrl!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 self-start text-sm/5 text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <UIcon
              name="i-ctm-link"
              class="size-4 shrink-0"
            /><span class="underline underline-offset-2">{{ r.name }}</span>
          </ULink>
        </div>
        <div
          v-else
          class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] bg-elevated p-3"
        >
          <span class="flex-1 basis-56 text-[13px]/[18px] text-toned">Progres ini belum punya tautan bukti. Tambahkan supaya bisa dilihat atasan.</span>
          <UButton
            size="sm"
            icon="i-ctm-link"
            @click="emit('addEvidence', entry.id)"
          >
            Tambah bukti
          </UButton>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-wrap items-center gap-2">
        <UButton
          variant="ghost"
          class="mr-auto"
          @click="open = false"
        >
          Tutup
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-ctm-copy"
          @click="copyEntry"
        >
          Salin untuk e-Kinerja
        </UButton>
        <UButton
          v-if="entry"
          :to="`/progres/${entry.id}`"
          icon="i-ctm-edit"
        >
          Ubah
        </UButton>
      </div>
    </template>
  </UModal>
</template>
