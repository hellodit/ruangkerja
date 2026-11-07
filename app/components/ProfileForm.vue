<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { profileSchema, type ProfileInput } from '#shared/schemas/workspace'

/** Isi profil (ONB-02) and the Profil page. Personal fields are encrypted server-side. */
const emit = defineEmits<{ saved: [] }>()

const notify = useNotify()
const form = useTemplateRef<{ submit: () => Promise<void> }>('form')
const saving = ref(false)
defineExpose({ submit: () => form.value?.submit(), saving })

const { data } = await useFetch('/api/profile', { key: 'profile' })

type ProfileState = Omit<ProfileInput, 'gender' | 'employmentStatus'> & { email: string, gender?: 'perempuan' | 'laki_laki', employmentStatus?: 'pns' | 'pppk' }
const state = reactive<ProfileState>({
  name: '', email: '', phoneWhatsapp: '', birthDate: '', gender: undefined, address: '', nip: '',
  employmentStatus: undefined, rankGrade: '', positionTitle: '', workUnit: '', agency: '', supervisorName: '', supervisorTitle: ''
})
watch(data, (d) => {
  if (d) {
    Object.assign(state, d)
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<ReturnType<typeof profileSchema.parse>>) {
  saving.value = true
  try {
    await $fetch('/api/profile', { method: 'PUT', body: event.data })
    await useMe().refresh()
    emit('saved')
  } catch (err) {
    notify.error(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm
    ref="form"
    :schema="profileSchema"
    :state="state"
    class="flex flex-col gap-6"
    @submit="onSubmit"
  >
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-highlighted">
          Data pribadi
        </h2>
      </template>
      <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <UFormField
          label="Nama lengkap"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            autocomplete="name"
          />
        </UFormField>
        <UFormField
          label="Email"
          name="email"
          help="Email akun untuk masuk."
        >
          <UInput
            :model-value="state.email"
            type="email"
            readonly
          />
        </UFormField>
        <UFormField
          label="Nomor WhatsApp"
          name="phoneWhatsapp"
          hint="Opsional"
        >
          <UInput
            v-model="state.phoneWhatsapp"
            type="tel"
            placeholder="0812 0000 0000"
            autocomplete="tel"
          />
        </UFormField>
        <UFormField
          label="Tanggal lahir"
          name="birthDate"
          hint="Opsional"
        >
          <UInput
            v-model="state.birthDate"
            trailing-icon="i-ctm-date"
            type="date"
          />
        </UFormField>
        <UFormField
          label="Jenis kelamin"
          name="gender"
          hint="Opsional"
        >
          <URadioGroup
            v-model="state.gender"
            orientation="horizontal"
            :items="[{ label: 'Perempuan', value: 'perempuan' }, { label: 'Laki-laki', value: 'laki_laki' }]"
          />
        </UFormField>
        <UFormField
          label="Alamat"
          name="address"
          hint="Opsional"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="state.address"
            :rows="2"
            autoresize
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-highlighted">
          Data kepegawaian
        </h2>
      </template>
      <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <UFormField
          label="NIP"
          name="nip"
          hint="Opsional"
          help="Disimpan terenkripsi."
        >
          <UInput
            v-model="state.nip"
            inputmode="numeric"
            maxlength="18"
            placeholder="18 angka"
          />
        </UFormField>
        <UFormField
          label="Status kepegawaian"
          name="employmentStatus"
          hint="Opsional"
        >
          <URadioGroup
            v-model="state.employmentStatus"
            orientation="horizontal"
            :items="[{ label: 'PNS', value: 'pns' }, { label: 'PPPK', value: 'pppk' }]"
          />
        </UFormField>
        <UFormField
          label="Pangkat/golongan"
          name="rankGrade"
          hint="Opsional"
        >
          <UInput
            v-model="state.rankGrade"
            placeholder="Contoh: Penata Muda Tingkat I, III/b"
          />
        </UFormField>
        <UFormField
          label="Jabatan"
          name="positionTitle"
          required
        >
          <UInput
            v-model="state.positionTitle"
            placeholder="Contoh: Perencana Ahli Pertama"
          />
        </UFormField>
        <UFormField
          label="Unit kerja"
          name="workUnit"
          required
        >
          <UInput
            v-model="state.workUnit"
            placeholder="Contoh: Bidang Perekonomian"
          />
        </UFormField>
        <UFormField
          label="Instansi"
          name="agency"
          required
        >
          <UInput
            v-model="state.agency"
            placeholder="Contoh: Bappeda Kabupaten Contoh"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-highlighted">
          Atasan langsung
        </h2>
        <p class="text-sm text-muted">
          Atasan yang menilai kinerja kamu.
        </p>
      </template>
      <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <UFormField
          label="Nama atasan"
          name="supervisorName"
          hint="Opsional"
        >
          <UInput v-model="state.supervisorName" />
        </UFormField>
        <UFormField
          label="Jabatan atasan"
          name="supervisorTitle"
          hint="Opsional"
        >
          <UInput v-model="state.supervisorTitle" />
        </UFormField>
      </div>
    </UCard>
    <slot :saving="saving" />
  </UForm>
</template>
