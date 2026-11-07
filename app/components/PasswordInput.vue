<script setup lang="ts">
/** CTM Field "Password": lock icon on the left, show/hide eye on the right. */
const model = defineModel<string>({ default: '' })
defineProps<{ autocomplete?: string, placeholder?: string }>()
const shown = ref(false)
</script>

<template>
  <UInput
    v-model="model"
    :type="shown ? 'text' : 'password'"
    icon="i-ctm-square-lock-01"
    :autocomplete="autocomplete"
    :placeholder="placeholder"
    class="w-full"
    :ui="{ trailing: 'pe-1.5' }"
  >
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="shown ? 'i-ctm-view-off' : 'i-ctm-view-on'"
        :aria-label="shown ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
        :aria-pressed="shown"
        @click="shown = !shown"
      />
    </template>
  </UInput>
</template>
