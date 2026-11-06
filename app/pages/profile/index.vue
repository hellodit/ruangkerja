<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const auth = useAuthSession()
const errorMessage = useAuthErrorMessage()

useSeoMeta({ title: () => t('profile.title'), robots: 'noindex' })

const user = computed(() => auth.user.value!)
const memberSince = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(user.value.createdAt)))

const sending = ref(false)
async function resendVerification() {
  sending.value = true
  const { error } = await useAuthClient().sendVerificationEmail({
    email: user.value.email,
    callbackURL: localePath('/verify-email')
  })
  sending.value = false
  if (error) {
    toast.add({ title: errorMessage(error), color: 'error' })
    return
  }
  toast.add({ title: t('profile.verificationSent'), color: 'success', icon: 'i-lucide-mail-check' })
}
</script>

<template>
  <UContainer class="max-w-3xl space-y-6 py-10">
    <UPageCard variant="subtle">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
        <UAvatar
          :src="user.image ?? undefined"
          :alt="user.name"
          size="3xl"
        />
        <div class="min-w-0 flex-1 space-y-1">
          <h1 class="truncate text-2xl font-semibold text-highlighted">
            {{ user.name }}
          </h1>
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate text-muted">{{ user.email }}</span>
            <UBadge
              v-if="user.emailVerified"
              color="success"
              variant="subtle"
              icon="i-lucide-badge-check"
            >
              {{ t('profile.verified') }}
            </UBadge>
            <UBadge
              v-else
              color="warning"
              variant="subtle"
              icon="i-lucide-circle-alert"
            >
              {{ t('profile.unverified') }}
            </UBadge>
          </div>
          <p class="text-sm text-muted">
            {{ t('profile.memberSince', { date: memberSince }) }}
          </p>
        </div>
        <UButton
          :to="localePath('/profile/edit')"
          icon="i-lucide-pencil"
          color="neutral"
          variant="subtle"
        >
          {{ t('nav.editProfile') }}
        </UButton>
      </div>

      <UAlert
        v-if="!user.emailVerified"
        class="mt-6"
        color="warning"
        variant="subtle"
        icon="i-lucide-mail-warning"
        :title="t('profile.unverified')"
        :actions="[{ label: t('profile.resendVerification'), color: 'warning', variant: 'outline', loading: sending, onClick: resendVerification }]"
      />
    </UPageCard>

    <DocumentList />
  </UContainer>
</template>
