<script setup lang="ts">
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

const username = defineModel<string>('username')
const password = defineModel<string>('password')
</script>

<template>
  <div class="flex flex-col">
    <DynamicLabeledInput :placeholder="$t('LoginWidgetUsernamePlaceholder')" v-model="username" />
    <DynamicLabeledInput
      :placeholder="$t('LoginWidgetPasswordPlaceholder')"
      v-model="password"
      inputType="password"
    />
  </div>
</template>
