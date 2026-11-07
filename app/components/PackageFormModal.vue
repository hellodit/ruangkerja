<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { packageSchema, type PackageInput } from '#shared/schemas/admin'

/** Admin: create or edit a package. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ pkg?: (PackageInput & { id: string }) | null }>()
const emit = defineEmits<{ saved: [] }>()
const notify = useNotify()

const state = reactive<{ name: string, description: string, price: number | undefined, durationDays: number | undefined, isActive: boolean }>({
  name: '', description: '', price: undefined, durationDays: 30, isActive: true
})
watch(open, (v) => {
  if (v) {
    Object.assign(state, props.pkg
      ? { name: props.pkg.name, description: props.pkg.description ?? '', price: props.pkg.price, durationDays: props.pkg.durationDays, isActive: props.pkg.isActive }
      : { name: '', description: '', price: undefined, durationDays: 30, isActive: true })
  }
})

const saving = ref(false)
async function onSubmit(event: FormSubmitEvent<PackageInput>) {
  saving.value = true
  try {
    if (props.pkg) {
      await $fetch(`/api/admin/packages/${props.pkg.id}`, { method: 'PUT', body: event.data })
      notify.success('Paket diperbarui')
    } else {
      await $fetch('/api/admin/packages', { method: 'POST', body: event.data })
      notify.success('Paket ditambahkan')
    }
    open.value = false
    emit('saved')
  } catch (err) {
    notify.error(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="pkg ? 'Ubah paket' : 'Tambah paket'"
    description="Perubahan paket tidak mengubah transaksi yang sudah tercatat."
  >
    <template #body>
      <UForm
        id="package-form"
        :schema="packageSchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Nama paket"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="Contoh: Pro Bulanan"
          />
        </UFormField>
        <UFormField
          label="Deskripsi"
          name="description"
          hint="Opsional"
        >
          <UTextarea
            v-model="state.description"
            :rows="2"
            autoresize
            placeholder="Contoh: Semua fitur, ekspor Word dan PDF"
          />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Harga"
            name="price"
            required
            help="Dalam rupiah. Isi 0 untuk paket gratis."
          >
            <UInputNumber
              v-model="state.price"
              locale="id-ID"
              :min="0"
              :step="1000"
              :increment="false"
              :decrement="false"
              :format-options="{ style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }"
              placeholder="Rp 0"
            />
          </UFormField>
          <UFormField
            label="Durasi"
            name="durationDays"
            required
            :help="state.durationDays ? `Masa aktif ${formatDurationDays(state.durationDays)}.` : 'Dalam hari.'"
          >
            <UInputNumber
              v-model="state.durationDays"
              locale="id-ID"
              :min="1"
              :max="3660"
              :increment="false"
              :decrement="false"
              :format-options="{ maximumFractionDigits: 0 }"
            />
          </UFormField>
        </div>
        <USwitch
          v-model="state.isActive"
          label="Aktif"
          description="Hanya paket aktif yang bisa di-assign ke pengguna."
        />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          variant="ghost"
          @click="open = false"
        >
          Batal
        </UButton>
        <UButton
          type="submit"
          form="package-form"
          :loading="saving"
        >
          {{ pkg ? 'Simpan perubahan' : 'Tambah paket' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
