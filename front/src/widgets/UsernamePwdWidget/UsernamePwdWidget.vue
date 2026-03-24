<script setup lang="ts">
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

defineProps(['autocompleteType', 'username', 'password'])
defineEmits(['update:username', 'update:password'])
</script>

<template>
  <div class="flex flex-col">
    <DynamicLabeledInput
      :placeholder="$t('LoginWidgetUsernamePlaceholder')"
      :value="username"
      name="username"
      autocomplete="username"
      @input="$emit('update:username', $event.target.value)"
    />
    <DynamicLabeledInput
      :placeholder="$t('LoginWidgetPasswordPlaceholder')"
      :value="password"
      name="password"
      type="password"
      :autocomplete="autocompleteType"
      @input="$emit('update:password', $event.target.value)"
      inputType="password"
    />
  </div>
</template>
