<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { assignPackageSchema, type AssignPackageInput } from '#shared/schemas/admin'

/**
 * Admin: give a user a package by hand (e.g. after a bank transfer). Saving
 * records a paid manual transaction; the server computes the final period.
 */
interface UserOption { id: string, name: string, email: string, paidUntil: string | null }

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user?: UserOption | null }>()
const emit = defineEmits<{ saved: [] }>()
const notify = useNotify()

const { data: pkgData, refresh: refreshPackages } = useFetch('/api/admin/packages', { key: 'admin-packages', immediate: false })
const activePackages = computed(() => (pkgData.value?.packages ?? []).filter(p => p.isActive))
const packageItems = computed(() => activePackages.value.map(p => ({ label: `${p.name} · ${formatRupiah(p.price)} · ${formatDurationDays(p.durationDays)}`, value: p.id })))

// User picker: server-side search over the admin user list.
const searchTerm = ref('')
const searchDebounced = refDebounced(searchTerm, 250)
const { data: userData, status: userStatus, execute: loadUsers } = useFetch('/api/admin/users', {
  query: computed(() => ({ q: searchDebounced.value || undefined, pageSize: 10 })),
  key: 'admin-assign-users',
  immediate: false,
  watch: false
})
watch(searchDebounced, () => {
  if (open.value && !props.user) loadUsers()
})
const userOptions = computed<UserOption[]>(() => (userData.value?.users ?? []).map(u => ({
  id: u.id, name: u.name, email: u.email, paidUntil: u.activePackage ? String(u.activePackage.paidUntil) : null
})))
const userItems = computed(() => userOptions.value.map(u => ({ label: u.name, description: u.email, value: u.id })))

const state = reactive<{ userId: string, packageId: string, amount: number | undefined, reference: string, notes: string }>({
  userId: '', packageId: '', amount: undefined, reference: '', notes: ''
})
const pickedUser = ref<UserOption | null>(null)

watch(open, async (v) => {
  if (!v) return
  Object.assign(state, { userId: props.user?.id ?? '', packageId: '', amount: undefined, reference: '', notes: '' })
  pickedUser.value = props.user ?? null
  searchTerm.value = ''
  await refreshPackages()
  if (!props.user) await loadUsers()
})
watch(() => state.userId, (id) => {
  if (!props.user) pickedUser.value = userOptions.value.find(u => u.id === id) ?? null
})
const selectedPackage = computed(() => activePackages.value.find(p => p.id === state.packageId) ?? null)
watch(selectedPackage, (p) => {
  if (p) state.amount = p.price
})

const longDate = (d: Date | string) => formatDateLong(todayInTimeZone('Asia/Jakarta', new Date(d)))
// Same rule as the server: ends at the current end date (or today) + the package's duration.
const preview = computed(() => {
  if (!selectedPackage.value) return null
  const currentEnd = pickedUser.value?.paidUntil ? new Date(pickedUser.value.paidUntil) : null
  const days = selectedPackage.value.durationDays
  const period = computePackagePeriod({ now: new Date(), currentEnd, durationDays: days })
  const base = currentEnd && currentEnd > new Date() ? `Tanggal berakhir sekarang (${longDate(currentEnd)})` : 'Hari ini'
  return { end: longDate(period.end), how: `${base} + ${days} hari (${formatDurationDays(days)})` }
})
const currentText = computed(() => {
  const until = pickedUser.value?.paidUntil
  return until ? `Paket aktif sampai ${longDate(until)}` : 'Belum punya paket aktif'
})

const saving = ref(false)
async function onSubmit(event: FormSubmitEvent<AssignPackageInput>) {
  saving.value = true
  try {
    await $fetch('/api/admin/transactions', { method: 'POST', body: event.data })
    notify.success(`Paket ${selectedPackage.value?.name ?? ''} di-assign ke ${pickedUser.value?.name ?? 'pengguna'}`)
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
    title="Assign paket"
    description="Mencatat transaksi manual berstatus lunas dan mengaktifkan paket untuk pengguna."
    :ui="{ content: 'sm:max-w-[560px]' }"
  >
    <template #body>
      <UForm
        id="assign-package-form"
        :schema="assignPackageSchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Pengguna"
          name="userId"
          required
          :help="pickedUser ? currentText : undefined"
        >
          <div
            v-if="user"
            class="flex h-11 items-center gap-2 rounded-md bg-muted px-3 text-sm"
          >
            <span class="font-semibold text-highlighted">{{ user.name }}</span>
            <span class="truncate text-toned">{{ user.email }}</span>
          </div>
          <USelectMenu
            v-else
            v-model="state.userId"
            v-model:search-term="searchTerm"
            :items="userItems"
            value-key="value"
            :loading="userStatus === 'pending'"
            ignore-filter
            placeholder="Cari nama atau email"
            :search-input="{ placeholder: 'Cari nama atau email', icon: 'i-ctm-search' }"
          />
        </UFormField>

        <UFormField
          label="Paket"
          name="packageId"
          required
          :help="activePackages.length ? undefined : 'Belum ada paket aktif. Tambahkan di menu Paket.'"
        >
          <USelect
            v-model="state.packageId"
            :items="packageItems"
            placeholder="Pilih paket"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Nominal dibayar"
            name="amount"
            required
            help="Terisi harga paket. Ubah bila ada diskon."
          >
            <UInputNumber
              v-model="state.amount"
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
            label="Referensi pembayaran"
            name="reference"
            hint="Opsional"
          >
            <UInput
              v-model="state.reference"
              placeholder="Contoh: TRF BCA 0711"
            />
          </UFormField>
        </div>

        <UFormField
          label="Catatan"
          name="notes"
          hint="Opsional"
        >
          <UTextarea
            v-model="state.notes"
            :rows="2"
            autoresize
            placeholder="Contoh: Promo peluncuran"
          />
        </UFormField>

        <UAlert
          v-if="preview"
          color="info"
          variant="subtle"
          icon="i-ctm-date"
          :title="`Paket berakhir ${preview.end}`"
          :description="`${preview.how}. ${selectedPackage!.name} · ${formatRupiah(state.amount ?? 0)} · dicatat sebagai transaksi manual (lunas).`"
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
          form="assign-package-form"
          :loading="saving"
          :disabled="!activePackages.length"
        >
          Assign dan catat transaksi
        </UButton>
      </div>
    </template>
  </UModal>
</template>
