<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseInput } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

const props = defineProps({
  inputWidth: {
    type: String,
    default: '100%',
    required: false
  },
  placeholder: {
    type: String,
    required: true
  },
  store: {
    type: Function,
    required: true
  }
})

const inputValue = ref('')
const store = props.store()

watch(inputValue, (newValue) => {
  inputValue.value = parseInput(newValue)
  if (inputValue.value === newValue) {
    store.setSearchString(newValue)
  }
})
</script>

<template>
  <div class="flex justify-center">
    <DynamicLabeledInput
      class="mr-4"
      :inputWidth="props.inputWidth"
      :placeholder="props.placeholder"
      v-model:value="inputValue"
    />
    <Button variant="default" size="default" @click="inputValue = ''"> Очистить поиск </Button>
  </div>
</template>
