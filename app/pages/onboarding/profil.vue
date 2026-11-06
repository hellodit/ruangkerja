<script setup lang="ts">
definePageMeta({ layout: 'onboarding' })
useSeoMeta({ title: 'Isi profil' })

const notify = useNotify()
const form = useTemplateRef<{ submit: () => Promise<void> }>('form')
const next = ref<'continue' | 'later'>('continue')

async function onSaved() {
  if (next.value === 'later') {
    notify.success('Profil tersimpan', 'Lanjutkan kapan saja, data tidak hilang.')
    return
  }
  await navigateTo('/onboarding/rhk')
}

function submit(mode: 'continue' | 'later') {
  next.value = mode
  form.value?.submit()
}
</script>

<template>
  <OnboardingShell :step="1">
    <div class="mb-6 max-w-2xl space-y-2">
      <h1 class="text-3xl font-bold tracking-tight text-highlighted">
        Isi profil kamu
      </h1>
      <p class="text-muted">
        Data dari pendaftaran sudah terisi. Periksa, lalu lengkapi yang masih kosong.
      </p>
    </div>
    <ProfileForm
      ref="form"
      @saved="onSaved"
    />

    <template #footer>
      <span class="flex-1 text-sm text-muted">Langkah 1 dari 3</span>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        @click="submit('later')"
      >
        Simpan dan lanjutkan nanti
      </UButton>
      <UButton
        size="lg"
        trailing-icon="i-lucide-chevron-right"
        @click="submit('continue')"
      >
        Lanjut
      </UButton>
    </template>
  </OnboardingShell>
</template>
