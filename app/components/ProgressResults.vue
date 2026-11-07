<script setup lang="ts">
/** PRG-06: one or more work results, each with an optional evidence link. */
export interface ResultRow { name: string, evidenceUrl?: string }

const results = defineModel<ResultRow[]>({ required: true })

function add() {
  results.value.push({ name: '', evidenceUrl: '' })
}

function remove(index: number) {
  results.value.splice(index, 1)
}
</script>

<template>
  <div
    role="group"
    aria-labelledby="hs-title"
    class="flex flex-col gap-3"
  >
    <div>
      <p
        id="hs-title"
        class="text-sm font-semibold text-highlighted"
      >
        Hasil kerja dan bukti dukung
      </p>
      <p class="text-sm text-muted">
        Satu isian untuk tiap hasil. Pastikan tautan bisa dibuka oleh siapa saja yang memiliki link.
      </p>
    </div>
    <div
      v-for="(item, index) in results"
      :key="index"
      class="flex flex-col gap-3 rounded-md border border-default p-4"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-highlighted">Hasil {{ index + 1 }}</span>
        <UButton
          icon="i-ctm-delete"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="`Hapus hasil ${index + 1}`"
          @click="remove(index)"
        />
      </div>
      <UFormField
        label="Nama hasil"
        :name="`results.${index}.name`"
      >
        <UTextarea
          v-model="item.name"
          :rows="2"
          autoresize
          placeholder="Contoh: Telaahan ketahanan pangan revisi 3"
        />
      </UFormField>
      <UFormField
        label="Tautan bukti"
        hint="Opsional"
        :name="`results.${index}.evidenceUrl`"
      >
        <UInput
          v-model="item.evidenceUrl"
          inputmode="url"
          icon="i-ctm-link"
          placeholder="Contoh: tautan Google Drive"
        />
      </UFormField>
    </div>
    <UButton
      icon="i-ctm-plus"
      color="neutral"
      variant="ghost"
      class="self-start"
      :disabled="results.length >= 10"
      @click="add"
    >
      Tambah hasil
    </UButton>
  </div>
</template>
