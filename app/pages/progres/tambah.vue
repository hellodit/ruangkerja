<script setup lang="ts">
useSeoMeta({ title: 'Tambah progres harian' })
const route = useRoute()
const notify = useNotify()
const { me } = useMe()
const today = computed(() => me.value?.today ?? todayInTimeZone('Asia/Jakarta'))

const q = route.query
const time = (v: unknown) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : undefined)
const start = time(q.start)
const initial = {
  ...(typeof q.actionPlanId === 'string' ? { actionPlanId: q.actionPlanId } : {}),
  ...(typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? { workDate: q.date } : {}),
  ...(start ? { startTime: start, endTime: `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, '0')}:${start.slice(3)}` } : {})
}

async function onSaved(mode: 'done' | 'again') {
  notify.success('Progres harian tersimpan')
  if (mode === 'done') {
    await navigateTo('/progres')
  }
}
</script>

<template>
  <UDashboardPanel id="progres-tambah">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UButton
            to="/progres"
            icon="i-ctm-chevron-left"
            color="neutral"
            variant="ghost"
            aria-label="Kembali ke daftar progres harian"
          />
        </template>
        <template #title>
          <div class="flex flex-col">
            <span class="text-xs text-muted">Progres harian</span>
            <h1 class="text-xl font-semibold text-highlighted">
              Tambah progres harian
            </h1>
          </div>
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-6xl">
        <ProgressForm
          :initial="initial"
          :today="today"
          @saved="onSaved"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
