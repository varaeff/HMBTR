<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseInput } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

const props = defineProps({
  placeholder: {
    type: String,
    required: true
  },
  store: {
    type: Function,
    required: true
  },
  inputType: {
    type: String,
    required: false,
    default: 'text'
  }
})

const inputValue = ref('')
const store = props.store()

watch(inputValue, (newValue) => {
  inputValue.value = parseInput(newValue, props.inputType)
  if (inputValue.value === newValue) {
    store.setSearchString(newValue)
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-center">
    <DynamicLabeledInput
      class="min-w-0"
      :placeholder="$t(props.placeholder)"
      v-model:value="inputValue"
    />
    <Button
      class="w-full sm:w-auto sm:shrink-0"
      variant="default"
      size="default"
      @click="inputValue = ''"
    >
      {{ $t('searchClear') }}
    </Button>
  </div>
</template>
