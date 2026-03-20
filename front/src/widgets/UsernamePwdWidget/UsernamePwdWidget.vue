<script setup lang="ts">
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

defineProps(['username', 'password'])
defineEmits(['update:username', 'update:password'])
</script>

<template>
  <div class="flex flex-col">
    <DynamicLabeledInput
      :placeholder="$t('LoginWidgetUsernamePlaceholder')"
      :value="username"
      @input="$emit('update:username', $event.target.value)"
    />
    <DynamicLabeledInput
      :placeholder="$t('LoginWidgetPasswordPlaceholder')"
      :value="password"
      @input="$emit('update:password', $event.target.value)"
      inputType="password"
    />
  </div>
</template>
