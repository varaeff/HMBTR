<script setup lang="ts">
import { ref } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

defineProps(['autocompleteType', 'username', 'password'])
defineEmits(['update:username', 'update:password'])

const showPwd = ref(false)
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
      :autocomplete="autocompleteType"
      @input="$emit('update:password', $event.target.value)"
      :inputType="showPwd ? 'visiblePassword' : 'password'"
    />
    <Label class="flex cursor-pointer items-center text-sm text-muted-foreground mr-3 gap-2">
      <Checkbox v-model="showPwd" />
      {{ $t('LoginWidgetShowPassword') }}
    </Label>
  </div>
</template>
