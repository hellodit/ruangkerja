<script setup lang="ts">
import type { InternalApi } from 'nitropack'

type Entry = InternalApi['/api/progress']['get']['entries'][number]

/** PRG-04: detail dialog for one calendar entry. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ entry: Entry | null }>()
const emit = defineEmits<{ addEvidence: [id: string] }>()
const copy = useCopyText()

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
    :title="entry?.plan.name ?? ''"
    :description="entry ? `${formatDateLong(entry.workDate)} · ${formatTime(entry.startTime)}–${formatTime(entry.endTime)} · ${formatDuration(minutesBetween(entry.startTime, entry.endTime))}` : ''"
  >
    <template #body>
      <div
        v-if="entry"
        class="flex flex-col gap-5"
      >
        <div class="flex flex-wrap items-center gap-2">
          <RhkTag :number="entry.rhk.number" />
          <UBadge
            v-if="!entry.hasEvidence"
            color="warning"
            variant="subtle"
          >
            Belum ada bukti
          </UBadge>
        </div>
        <div>
          <p class="mb-1 text-xs font-semibold text-muted uppercase">
            Uraian
          </p>
          <p class="text-sm">
            {{ entry.description }}
          </p>
        </div>
        <dl class="grid grid-cols-[110px_minmax(0,1fr)] gap-y-2 text-sm">
          <dt class="text-muted">
            RHK
          </dt><dd>{{ entry.rhk.statement }}</dd>
          <dt class="text-muted">
            Rencana aksi
          </dt><dd>{{ entry.plan.name }}</dd>
          <dt class="text-muted">
            Realisasi
          </dt><dd>{{ formatNumber(entry.realization) }} {{ entry.plan.unit }}</dd>
          <dt class="text-muted">
            Kategori
          </dt><dd>{{ CATEGORY_LABELS[entry.category] }}</dd>
        </dl>
        <div>
          <p class="mb-2 text-xs font-semibold text-muted uppercase">
            Bukti dukung
          </p>
          <ul
            v-if="entry.hasEvidence"
            class="flex flex-col gap-1.5"
          >
            <li
              v-for="r in entry.results.filter(x => x.evidenceUrl)"
              :key="r.id"
            >
              <ULink
                :to="r.evidenceUrl!"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 text-sm text-info"
              >
                <UIcon
                  name="i-ctm-link"
                  class="size-4 shrink-0"
                /><span class="truncate">{{ r.name }}</span>
              </ULink>
            </li>
          </ul>
          <UAlert
            v-else
            color="warning"
            variant="subtle"
            icon="i-ctm-warning"
            title="Progres ini belum punya tautan bukti."
            description="Tambahkan supaya bisa dilihat atasan."
            :actions="[{ label: 'Tambah bukti', icon: 'i-ctm-link', onClick: () => emit('addEvidence', entry!.id) }]"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
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
