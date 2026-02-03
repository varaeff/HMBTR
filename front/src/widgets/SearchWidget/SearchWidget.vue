<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseInput } from '@/features/parseInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps({
  placeholder: {
    type: String,
    reqired: true
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
    store.$state.seachString = newValue
  }
})
</script>

<template>
  <Input
    class="w-[30%] mr-4"
    type="text"
    maxlength="64"
    :placeholder="props.placeholder"
    v-model="inputValue"
  />
  <Button variant="default" size="default" @click="inputValue = ''"> Очистить поиск </Button>
</template>
