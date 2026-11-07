<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { changePasswordSchema, type ChangePasswordInput } from '#shared/schemas/auth'
import { settingsSchema } from '#shared/schemas/workspace'

useSeoMeta({ title: 'Profil dan pengaturan', robots: 'noindex' })

const notify = useNotify()
const auth = useAuthSession()
const client = useAuthClient()
const { me } = useMe()
await auth.ensure()

// --- profile --------------------------------------------------------------
const profileForm = useTemplateRef<{ submit: () => Promise<void> }>('profileForm')
function onProfileSaved() {
  notify.success('Profil tersimpan')
  auth.refresh()
}

// --- verification -----------------------------------------------------------
const sending = ref(false)
async function resendVerification() {
  if (!auth.user.value) {
    return
  }
  sending.value = true
  const { error } = await client.sendVerificationEmail({ email: auth.user.value.email, callbackURL: '/verify-email' })
  sending.value = false
  if (error) {
    notify.error({ statusMessage: authErrorMessage(error) })
    return
  }
  notify.success('Email verifikasi dikirim')
}

// --- password -----------------------------------------------------------------
const { data: hasPassword } = await useAsyncData('auth:has-password', async () => {
  if (import.meta.server) {
    const accounts = await useRequestFetch()<Array<{ providerId: string }>>('/api/auth/list-accounts')
    return accounts.some(a => a.providerId === 'credential')
  }
  const { data } = await client.listAccounts()
  return (data ?? []).some(a => a.providerId === 'credential')
}, { default: () => false })

const pw = reactive({ currentPassword: '', newPassword: '', confirmPassword: '', revokeOtherSessions: true })
const savingPw = ref(false)
async function savePassword(event: FormSubmitEvent<ChangePasswordInput>) {
  savingPw.value = true
  const { error } = await client.changePassword({
    currentPassword: event.data.currentPassword,
    newPassword: event.data.newPassword,
    revokeOtherSessions: event.data.revokeOtherSessions ?? true
  })
  savingPw.value = false
  if (error) {
    notify.error({ statusMessage: authErrorMessage(error) })
    return
  }
  Object.assign(pw, { currentPassword: '', newPassword: '', confirmPassword: '' })
  notify.success('Kata sandi diubah')
}

// --- reminders & preferences ---------------------------------------------------
const { data: settings } = await useFetch('/api/settings', { key: 'settings' })
const prefs = reactive({ remindBeforeDeadline: true, remindDaysBefore: 3, remindDaily: true, remindDailyTime: '16:00' })
watch(settings, (s) => {
  if (s) {
    Object.assign(prefs, { remindBeforeDeadline: s.remindBeforeDeadline, remindDaysBefore: s.remindDaysBefore, remindDaily: s.remindDaily, remindDailyTime: s.remindDailyTime })
  }
}, { immediate: true })
const savingPrefs = ref(false)
async function savePrefs() {
  savingPrefs.value = true
  try {
    await $fetch('/api/settings', { method: 'PATCH', body: prefs })
    notify.success('Pengaturan pengingat tersimpan')
  } catch (err) {
    notify.error(err)
  } finally {
    savingPrefs.value = false
  }
}

// --- account deletion ------------------------------------------------------------
const deleteOpen = ref(false)
const deletePassword = ref('')
const deleting = ref(false)
async function deleteAccount() {
  deleting.value = true
  const { error } = await client.deleteUser(hasPassword.value ? { password: deletePassword.value } : {})
  deleting.value = false
  if (error) {
    notify.error({ statusMessage: authErrorMessage(error) })
    return
  }
  await auth.signOut().catch(() => {})
  notify.success('Akun dan seluruh data sudah dihapus')
  await navigateTo('/login')
}
</script>

<template>
  <UDashboardPanel id="profil">
    <template #header>
      <UDashboardNavbar title="Profil dan pengaturan" />
    </template>

    <template #body>
      <div class="flex w-full max-w-4xl flex-col gap-6">
        <UAlert
          v-if="me && !me.onboardingCompleted"
          color="info"
          variant="subtle"
          icon="i-ctm-workflow-01"
          title="Persiapan belum selesai"
          :actions="[{ label: 'Lanjutkan persiapan', to: '/onboarding/profil' }]"
        />

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              Foto profil
            </h2>
          </template>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <AvatarUploader />
            <div class="flex flex-col items-start gap-2 sm:items-end">
              <UBadge
                v-if="auth.user.value?.emailVerified"
                color="success"
                variant="subtle"
                icon="i-ctm-checkmark-circle"
              >
                Email terverifikasi
              </UBadge>
              <template v-else>
                <UBadge
                  color="warning"
                  variant="subtle"
                  icon="i-ctm-email-notification"
                >
                  Email belum diverifikasi
                </UBadge>
                <UButton
                  variant="ghost"
                  size="sm"
                  :loading="sending"
                  @click="resendVerification"
                >
                  Kirim ulang email verifikasi
                </UButton>
              </template>
            </div>
          </div>
        </UCard>

        <ProfileForm
          ref="profileForm"
          @saved="onProfileSaved"
        >
          <div class="flex justify-end">
            <UButton type="submit">
              Simpan profil
            </UButton>
          </div>
        </ProfileForm>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              Pengingat
            </h2>
            <p class="text-sm text-muted">
              Saluran pengiriman pengingat sedang disiapkan.
            </p>
          </template>
          <form
            class="flex flex-col gap-5"
            @submit.prevent="savePrefs"
          >
            <USwitch
              v-model="prefs.remindBeforeDeadline"
              label="Ingatkan sebelum batas pengisian"
            />
            <UFormField
              v-if="prefs.remindBeforeDeadline"
              label="Berapa hari sebelumnya"
              class="max-w-xs"
            >
              <UInputNumber
                v-model="prefs.remindDaysBefore"
                :min="1"
                :max="14"
              />
            </UFormField>
            <USwitch
              v-model="prefs.remindDaily"
              label="Ingatkan mencatat progres harian"
            />
            <UFormField
              v-if="prefs.remindDaily"
              label="Jam pengingat harian"
              class="max-w-xs"
            >
              <UInput
                v-model="prefs.remindDailyTime"
                trailing-icon="i-ctm-clock"
                type="time"
              />
            </UFormField>
            <div class="flex justify-end">
              <UButton
                type="submit"
                color="neutral"
                variant="outline"
                :loading="savingPrefs"
                :disabled="!settingsSchema.safeParse(prefs).success"
              >
                Simpan pengingat
              </UButton>
            </div>
          </form>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              Ubah kata sandi
            </h2>
          </template>
          <UForm
            v-if="hasPassword"
            :schema="changePasswordSchema"
            :state="pw"
            class="flex flex-col gap-4"
            @submit="savePassword"
          >
            <UFormField
              label="Kata sandi saat ini"
              name="currentPassword"
              required
            >
              <UInput
                v-model="pw.currentPassword"
                type="password"
                icon="i-ctm-square-lock-01"
                autocomplete="current-password"
              />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField
                label="Kata sandi baru"
                name="newPassword"
                required
              >
                <UInput
                  v-model="pw.newPassword"
                  type="password"
                  icon="i-ctm-square-lock-01"
                  autocomplete="new-password"
                />
              </UFormField>
              <UFormField
                label="Konfirmasi kata sandi"
                name="confirmPassword"
                required
              >
                <UInput
                  v-model="pw.confirmPassword"
                  type="password"
                  icon="i-ctm-square-lock-01"
                  autocomplete="new-password"
                />
              </UFormField>
            </div>
            <UCheckbox
              v-model="pw.revokeOtherSessions"
              label="Keluarkan dari semua perangkat lain"
            />
            <div class="flex justify-end">
              <UButton
                type="submit"
                color="neutral"
                variant="outline"
                :loading="savingPw"
              >
                Simpan kata sandi
              </UButton>
            </div>
          </UForm>
          <UAlert
            v-else
            color="info"
            variant="subtle"
            icon="i-ctm-information"
            title="Akun ini masuk dengan Google atau tautan email"
            description="Gunakan “Lupa kata sandi” di halaman masuk bila ingin membuat kata sandi."
          />
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              Data dan akun
            </h2>
          </template>
          <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-medium text-highlighted">
                  Ekspor semua data
                </p>
                <p class="text-sm text-muted">
                  Unduh profil, RHK, rencana aksi, progres harian, bukti, dan realisasi dalam format JSON.
                </p>
              </div>
              <UButton
                to="/api/account/export"
                external
                download
                color="neutral"
                variant="outline"
                icon="i-ctm-upload"
              >
                Ekspor data
              </UButton>
            </div>
            <USeparator />
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-medium text-error">
                  Hapus akun
                </p>
                <p class="text-sm text-muted">
                  Menghapus akun beserta seluruh data secara permanen. Tidak bisa dibatalkan.
                </p>
              </div>
              <UButton
                color="error"
                variant="outline"
                icon="i-ctm-delete"
                @click="deleteOpen = true"
              >
                Hapus akun
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
      <UModal
        v-model:open="deleteOpen"
        title="Hapus akun dan seluruh data?"
        description="Semua RHK, rencana aksi, progres harian, bukti, dan realisasi dihapus permanen. Ekspor data dulu bila perlu."
      >
        <template #body>
          <UFormField
            v-if="hasPassword"
            label="Masukkan kata sandi untuk konfirmasi"
            required
          >
            <UInput
              v-model="deletePassword"
              type="password"
              autocomplete="current-password"
            />
          </UFormField>
          <p
            v-else
            class="text-sm text-muted"
          >
            Untuk keamanan, penghapusan hanya bisa dilakukan bila Anda baru saja masuk. Bila gagal, keluar lalu masuk lagi.
          </p>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              variant="ghost"
              @click="deleteOpen = false"
            >
              Batal
            </UButton>
            <UButton
              color="error"
              :loading="deleting"
              :disabled="hasPassword && !deletePassword"
              @click="deleteAccount"
            >
              Hapus akun permanen
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
