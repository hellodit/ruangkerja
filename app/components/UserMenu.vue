<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthSession()

const items = computed<DropdownMenuItem[][]>(() => [
  [{ label: auth.user.value?.email ?? '', type: 'label' }],
  [
    { label: t('nav.profile'), icon: 'i-lucide-user', to: localePath('/profile') },
    { label: t('nav.editProfile'), icon: 'i-lucide-settings', to: localePath('/profile/edit') }
  ],
  [{
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    color: 'error',
    onSelect: async () => {
      await auth.signOut()
      await navigateTo(localePath('/login'))
    }
  }]
])
</script>

<template>
  <div class="flex items-center gap-2">
    <template v-if="auth.user.value">
      <UDropdownMenu
        :items="items"
        :content="{ align: 'end' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          class="gap-2"
        >
          <UAvatar
            :src="auth.user.value.image ?? undefined"
            :alt="auth.user.value.name"
            size="xs"
          />
          <span class="hidden max-w-40 truncate sm:inline">{{ auth.user.value.name }}</span>
        </UButton>
      </UDropdownMenu>
    </template>
    <template v-else>
      <UButton
        :to="localePath('/login')"
        color="neutral"
        variant="ghost"
      >
        {{ t('nav.login') }}
      </UButton>
      <UButton :to="localePath('/register')">
        {{ t('nav.register') }}
      </UButton>
    </template>
  </div>
</template>
