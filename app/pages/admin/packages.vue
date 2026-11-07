<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { InternalApi } from 'nitropack'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Paket · Admin' })
type Pkg = InternalApi['/api/admin/packages']['get']['packages'][number]

const notify = useNotify()
const { data, status, refresh } = await useFetch('/api/admin/packages', { key: 'admin-packages' })
const packages = computed(() => data.value?.packages ?? [])

const formOpen = ref(false)
const editing = ref<Pkg | null>(null)
function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(p: Pkg) {
  editing.value = p
  formOpen.value = true
}

const archiving = ref<Pkg | null>(null)
const archiveBusy = ref(false)
async function confirmArchive() {
  if (!archiving.value) return
  archiveBusy.value = true
  try {
    await $fetch(`/api/admin/packages/${archiving.value.id}`, { method: 'DELETE' })
    notify.success(`Paket ${archiving.value.name} diarsipkan`)
    archiving.value = null
    await refresh()
  } catch (err) {
    notify.error(err)
  } finally {
    archiveBusy.value = false
  }
}

const rowMenu = (p: Pkg): DropdownMenuItem[][] => [
  [{ label: 'Ubah', icon: 'i-ctm-edit', onSelect: () => openEdit(p) }],
  [{ label: 'Arsipkan', icon: 'i-ctm-archive', color: 'error', onSelect: () => { archiving.value = p } }]
]

const columns: TableColumn<Pkg>[] = [
  { id: 'name', header: 'Paket' },
  { id: 'price', header: 'Harga' },
  { id: 'duration', header: 'Durasi' },
  { id: 'status', header: 'Status' },
  { id: 'usage', header: 'Pemakaian' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Aksi') }
]
</script>

<template>
  <UDashboardPanel id="admin-packages">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs/4 text-toned">Admin</span>
            <h1 class="text-xl/7 font-semibold tracking-[-0.2px] text-highlighted">
              Paket
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full max-w-[1200px] flex-col gap-5">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p class="flex-1 basis-60 text-sm text-toned">
            Paket yang bisa di-assign ke pengguna. Mengubah harga atau durasi tidak mengubah transaksi yang sudah tercatat.
          </p>
          <UButton
            icon="i-ctm-plus"
            @click="openCreate"
          >
            Tambah paket
          </UButton>
        </div>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <UTable
            :data="packages"
            :columns="columns"
            :loading="status === 'pending'"
          >
            <template #empty>
              <UEmpty
                icon="i-ctm-product"
                title="Belum ada paket"
                description="Tambahkan paket pertama, misalnya Pro Bulanan."
                :actions="[{ label: 'Tambah paket', icon: 'i-ctm-plus', onClick: openCreate }]"
                variant="naked"
              />
            </template>
            <template #name-cell="{ row }">
              <div class="flex max-w-80 flex-col">
                <span class="font-semibold text-highlighted">{{ row.original.name }}</span>
                <span
                  v-if="row.original.description"
                  class="text-[13px]/[18px] text-toned"
                >{{ row.original.description }}</span>
              </div>
            </template>
            <template #price-cell="{ row }">
              <span class="whitespace-nowrap tabular-nums">{{ formatRupiah(row.original.price) }}</span>
            </template>
            <template #duration-cell="{ row }">
              <span class="whitespace-nowrap">{{ formatDurationDays(row.original.durationDays) }}</span>
            </template>
            <template #status-cell="{ row }">
              <StatusChip :color="row.original.isActive ? 'success' : 'neutral'">
                {{ row.original.isActive ? 'Aktif' : 'Nonaktif' }}
              </StatusChip>
            </template>
            <template #usage-cell="{ row }">
              <div class="flex flex-col whitespace-nowrap">
                <span class="text-highlighted tabular-nums">{{ formatNumber(row.original.activeUsers) }} pengguna aktif</span>
                <span class="text-[13px]/[18px] text-toned">{{ formatNumber(row.original.transactionCount) }} transaksi</span>
              </div>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UDropdownMenu
                  :items="rowMenu(row.original)"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    icon="i-ctm-more-vertical"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Menu paket ${row.original.name}`"
                  />
                </UDropdownMenu>
              </div>
            </template>
          </UTable>
        </UCard>
      </div>

      <PackageFormModal
        v-model:open="formOpen"
        :pkg="editing"
        @saved="refresh"
      />

      <UModal
        :open="!!archiving"
        title="Arsipkan paket?"
        :description="archiving ? `${archiving.name} tidak bisa di-assign lagi dan hilang dari daftar. Transaksi lama dan masa aktif pengguna tidak berubah.` : ''"
        @update:open="v => { if (!v) archiving = null }"
      >
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              variant="ghost"
              @click="archiving = null"
            >
              Batal
            </UButton>
            <UButton
              color="error"
              :loading="archiveBusy"
              @click="confirmArchive"
            >
              Arsipkan paket
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
