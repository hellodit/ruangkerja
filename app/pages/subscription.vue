<script setup lang="ts">
definePageMeta({ layout: 'onboarding' })
useSeoMeta({ title: 'Pilih paket' })

/**
 * Package checkout. Users without an active package land here; users with
 * one come here to renew (the new period is added after the current one).
 * With SumoPay the user is sent to its hosted payment page and comes back
 * here (?payment=success|cancel); the webhook activates the package, and a
 * pending order is reached from the payment history (pay or cancel there).
 * In manual mode (NUXT_PAYMENT_MODE=manual), payment is a bank transfer
 * confirmed by an admin, shown in the instructions card.
 */
const notify = useNotify()
const toast = useToast()
const copy = useCopyText()
const auth = useAuthSession()
const { me, refresh: refreshMe } = useMe()
const payment = useRuntimeConfig().public.payment
const supportEmail = useRuntimeConfig().public.supportEmail

const { data, refresh: refreshStatus } = await useFetch('/api/subscription', { key: 'subscription' })
const { data: history, refresh: refreshHistory } = await useFetch('/api/subscription/history', { key: 'subscription-history', default: () => [] })
const refresh = () => Promise.all([refreshStatus(), refreshHistory()])
const packages = computed(() => data.value?.packages ?? [])
const current = computed(() => data.value?.current ?? null)
const order = computed(() => data.value?.pendingOrder ?? null)
const longDate = (ts: string | Date) => formatDateLong(todayInTimeZone('Asia/Jakarta', new Date(ts)))
const bankReady = computed(() => !!(payment.bankName && payment.accountNumber))
const viaGateway = computed(() => order.value?.method === 'sumopay')
/** Pending bank-transfer order: the only kind with an instructions card. */
const manualOrder = computed(() => (order.value && !viaGateway.value ? order.value : null))

const busyId = ref<string | null>(null)
async function choose(packageId: string) {
  busyId.value = packageId
  try {
    const res = await $fetch('/api/subscription/checkout', { method: 'POST', body: { packageId } })
    if (res.paymentUrl) {
      // Keep the button busy while the browser leaves for SumoPay.
      await navigateTo(res.paymentUrl, { external: true })
      return
    }
    await refresh()
    await nextTick()
    document.getElementById('pembayaran')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (err) {
    notify.error(err)
  } finally {
    busyId.value = null
  }
}

const cancelling = ref(false)
async function cancelOrder() {
  cancelling.value = true
  try {
    await $fetch('/api/subscription/cancel', { method: 'POST' })
    await refresh()
    notify.success('Pesanan dibatalkan')
  } catch (err) {
    notify.error(err)
  } finally {
    cancelling.value = false
  }
}

// After an admin confirms the payment the package turns active: detect it
// (new package, or a later end date when renewing) and move on.
const startEnd = me.value?.subscription?.endsAt ?? null
const checking = ref(false)
async function checkStatus(manual = false) {
  checking.value = true
  try {
    await refreshMe()
    const end = me.value?.subscription?.endsAt ?? null
    if (end && end !== startEnd) {
      notify.success(`Pembayaran diterima. Paket aktif sampai ${longDate(end)}.`)
      await navigateTo(me.value?.onboardingCompleted ? '/beranda' : '/onboarding/profil')
      return
    }
    await refresh()
    if (manual) notify.success('Pembayaran belum dikonfirmasi admin. Coba lagi nanti.')
  } finally {
    checking.value = false
  }
}
// The gateway confirms within seconds; an admin takes longer.
const pollMs = computed(() => (viaGateway.value ? 5_000 : 20_000))
const poll = useIntervalFn(() => checkStatus(), pollMs, { immediate: false })
watch(order, o => (o ? poll.resume() : poll.pause()), { immediate: true })

// Back from SumoPay's hosted page.
const route = useRoute()
onMounted(() => {
  const returned = route.query.payment
  if (returned !== 'success' && returned !== 'cancel') return
  navigateTo({ query: { ...route.query, payment: undefined } }, { replace: true })
  if (returned === 'cancel') {
    toast.add({ title: 'Pembayaran belum diselesaikan', description: 'Lanjutkan dari Riwayat pembayaran sebelum tautannya kedaluwarsa.', color: 'warning', icon: 'i-ctm-information' })
    return
  }
  // The webhook can beat the redirect: the package is already active.
  if (!order.value && current.value) {
    notify.success(`Pembayaran diterima. Paket aktif sampai ${longDate(current.value.endsAt)}.`)
    navigateTo(me.value?.onboardingCompleted ? '/beranda' : '/onboarding/profil')
    return
  }
  toast.add({ title: 'Pembayaran sedang diverifikasi', description: 'Paket aktif otomatis dalam beberapa detik.', color: 'info', icon: 'i-ctm-clock' })
  checkStatus()
})

const waLink = computed(() => {
  if (!payment.whatsapp || !order.value) return null
  const text = `Halo, saya sudah transfer untuk pesanan ${order.value.code} (${order.value.packageName}, ${formatRupiah(order.value.amount)}) atas nama ${me.value?.user.name ?? ''} (${me.value?.user.email ?? ''}).`
  return `https://wa.me/${payment.whatsapp}?text=${encodeURIComponent(text)}`
})

async function signOut() {
  await auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="flex items-center gap-3 border-b border-default bg-default px-4 py-3 sm:px-8">
      <AppLogo />
      <div class="ml-auto flex items-center gap-2">
        <UButton
          v-if="current"
          to="/beranda"
          variant="ghost"
          icon="i-ctm-back-01"
        >
          Kembali ke ruang kerja
        </UButton>
        <span class="hidden text-sm text-toned sm:inline">{{ me?.user.email }}</span>
        <ThemeSwitch />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-ctm-logout"
          @click="signOut"
        >
          Keluar
        </UButton>
      </div>
    </header>

    <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-10 pb-16 sm:px-8">
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-bold tracking-[-0.15px] text-highlighted sm:text-[28px]/9">
          {{ current ? 'Perpanjang paket' : 'Pilih paket Ruang Kerja' }}
        </h1>
        <p class="max-w-2xl text-base text-toned">
          Catat progres harian, kumpulkan tautan bukti, dan susun draf realisasi per periode. Pilih paket, lalu selesaikan pembayaran untuk membuka ruang kerja.
        </p>
      </div>

      <UAlert
        v-if="current"
        color="info"
        variant="subtle"
        icon="i-ctm-checkmark-circle"
        :title="`Paket ${current.name} aktif sampai ${longDate(current.endsAt)} (${current.daysLeft} hari lagi)`"
        description="Perpanjangan ditambahkan setelah tanggal itu, jadi tidak ada hari yang hilang."
      />
      <UAlert
        v-else-if="data?.expiredAt"
        color="warning"
        variant="subtle"
        icon="i-ctm-warning"
        :title="`Paket Anda berakhir pada ${longDate(data.expiredAt)}`"
        description="Data Anda tetap tersimpan. Perpanjang paket untuk membuka ruang kerja lagi."
      />

      <UCard
        v-if="manualOrder"
        id="pembayaran"
        class="scroll-mt-6 ring-2 ring-primary"
        :ui="{ body: 'flex flex-col gap-5' }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <StatusChip
              color="warning"
              class="self-start"
            >
              Menunggu pembayaran
            </StatusChip>
            <h2 class="text-lg/[26px] font-semibold text-highlighted">
              {{ manualOrder.packageName }} · {{ formatDurationDays(manualOrder.durationDays) }}
            </h2>
            <p class="text-sm text-toned">
              Kode pesanan <span class="font-mono font-semibold text-highlighted">{{ manualOrder.code }}</span>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-ctm-copy"
                :aria-label="`Salin kode pesanan ${manualOrder.code}`"
                @click="copy(manualOrder.code!, 'Kode pesanan disalin')"
              />
            </p>
          </div>
          <div class="flex flex-col items-start sm:items-end">
            <span class="text-xs text-toned">Total pembayaran</span>
            <span class="text-[28px]/9 font-bold text-highlighted tabular-nums">{{ formatRupiah(manualOrder.amount) }}</span>
          </div>
        </div>

        <div
          v-if="bankReady"
          class="grid gap-4 rounded-md bg-muted p-4 sm:grid-cols-3"
        >
          <div class="flex flex-col">
            <span class="text-xs text-toned">Bank</span>
            <span class="font-semibold text-highlighted">{{ payment.bankName }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs text-toned">Nomor rekening</span>
            <span class="flex items-center gap-1 font-mono font-semibold text-highlighted">
              {{ payment.accountNumber }}
              <UButton
                variant="ghost"
                size="xs"
                icon="i-ctm-copy"
                aria-label="Salin nomor rekening"
                @click="copy(payment.accountNumber, 'Nomor rekening disalin')"
              />
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs text-toned">Atas nama</span>
            <span class="font-semibold text-highlighted">{{ payment.accountName || '—' }}</span>
          </div>
        </div>
        <UAlert
          v-else
          color="warning"
          variant="subtle"
          icon="i-ctm-information"
          title="Instruksi pembayaran belum diatur"
          :description="supportEmail ? `Hubungi ${supportEmail} dengan kode pesanan di atas untuk menyelesaikan pembayaran.` : 'Hubungi admin Ruang Kerja dengan kode pesanan di atas untuk menyelesaikan pembayaran.'"
        />

        <ol class="flex list-decimal flex-col gap-1.5 ps-5 text-sm text-highlighted">
          <li>Transfer tepat <strong>{{ formatRupiah(manualOrder.amount) }}</strong> ke rekening di atas.</li>
          <li>Tulis kode <strong class="font-mono">{{ manualOrder.code }}</strong> di berita transfer.</li>
          <li v-if="waLink">
            Kirim bukti transfer lewat WhatsApp.
          </li>
          <li>Paket aktif setelah admin mengonfirmasi pembayaran. Halaman ini memeriksa statusnya otomatis.</li>
        </ol>

        <div class="flex flex-wrap items-center gap-3 border-t border-default pt-4">
          <UButton
            v-if="waLink"
            :to="waLink"
            target="_blank"
            icon="i-ctm-whatsapp"
          >
            Konfirmasi lewat WhatsApp
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-ctm-refresh"
            :loading="checking"
            @click="checkStatus(true)"
          >
            Cek status pembayaran
          </UButton>
          <UButton
            variant="ghost"
            class="ml-auto"
            :loading="cancelling"
            @click="cancelOrder"
          >
            Batalkan pesanan
          </UButton>
        </div>
      </UCard>

      <section
        aria-labelledby="daftar-paket"
        class="flex flex-col gap-4"
      >
        <h2
          id="daftar-paket"
          class="text-lg/[26px] font-semibold text-highlighted"
        >
          {{ manualOrder ? 'Ganti paket' : 'Paket tersedia' }}
        </h2>
        <UEmpty
          v-if="!packages.length"
          icon="i-ctm-product"
          title="Belum ada paket yang dijual"
          :description="supportEmail ? `Hubungi ${supportEmail}.` : 'Hubungi admin Ruang Kerja.'"
        />
        <div
          v-else
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <UCard
            v-for="p in packages"
            :key="p.id"
            :class="manualOrder?.packageId === p.id && 'ring-2 ring-primary'"
            :ui="{ body: 'flex h-full flex-col gap-4' }"
          >
            <div class="flex flex-col gap-1">
              <span class="text-base font-semibold text-highlighted">{{ p.name }}</span>
              <span class="flex items-baseline gap-1">
                <span class="text-[28px]/9 font-bold text-highlighted tabular-nums">{{ formatRupiah(p.price) }}</span>
                <span class="text-sm text-toned">/ {{ formatDurationDays(p.durationDays) }}</span>
              </span>
            </div>
            <p
              v-if="p.description"
              class="text-sm text-toned"
            >
              {{ p.description }}
            </p>
            <UButton
              block
              class="mt-auto"
              :variant="manualOrder?.packageId === p.id ? 'soft' : 'solid'"
              :disabled="manualOrder?.packageId === p.id"
              :loading="busyId === p.id"
              @click="choose(p.id)"
            >
              {{ manualOrder?.packageId === p.id ? 'Dipilih' : current ? 'Perpanjang dengan paket ini' : 'Pilih paket' }}
            </UButton>
          </UCard>
        </div>
      </section>

      <PaymentHistory
        :items="history"
        :cancelling="cancelling"
        @cancel="cancelOrder"
      />

      <p class="text-xs text-muted">
        Butuh bantuan? Data akun dan ekspor data tetap bisa dibuka di
        <ULink
          to="/profil"
          class="underline underline-offset-2"
        >Profil</ULink>.
        <ULink
          to="/privasi"
          class="underline underline-offset-2"
        >Kebijakan privasi</ULink>
      </p>
    </div>
  </div>
</template>
