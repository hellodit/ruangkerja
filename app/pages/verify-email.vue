<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthSession()

useSeoMeta({ title: () => t('auth.verify.title'), robots: 'noindex' })

// Better Auth redirects here after verification; failures carry ?error=...
const failed = computed(() => typeof route.query.error === 'string')

// autoSignInAfterVerification may have just created a session.
await auth.refresh()
</script>

<template>
  <AuthCard>
    <div class="space-y-6 text-center">
      <UIcon
        :name="failed ? 'i-lucide-circle-x' : 'i-lucide-badge-check'"
        class="mx-auto size-12"
        :class="failed ? 'text-error' : 'text-primary'"
      />
      <h1 class="text-xl font-semibold text-highlighted">
        {{ t('auth.verify.title') }}
      </h1>
      <p class="text-muted">
        {{ failed ? t('auth.verify.failed') : t('auth.verify.success') }}
      </p>
      <UButton
        :to="localePath(auth.loggedIn.value ? '/profile' : '/login')"
        block
      >
        {{ auth.loggedIn.value ? t('auth.verify.goProfile') : t('auth.verify.goLogin') }}
      </UButton>
    </div>
  </AuthCard>
</template>
