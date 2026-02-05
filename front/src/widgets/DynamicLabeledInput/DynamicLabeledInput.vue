<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseInput } from '@/features/parseInput'
import { Input } from '@/components/ui/input'

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
  value: {
    type: String,
    default: '',
    required: false
  }
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const inputId = computed(() => `input-${Math.random().toString(36).slice(2, 11)}`)
const inputValue = ref(props.value)
const isFocused = ref(false)

const isFilled = computed(() => inputValue.value.trim() !== '')

watch(
  () => props.value,
  (newValue) => {
    inputValue.value = newValue
  }
)

watch(
  () => inputValue.value,
  (newValue) => {
    const parsedValue = parseInput(newValue)
    inputValue.value = parsedValue
    if (parsedValue === newValue) {
      emit('update:value', newValue)
    }
  }
)

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}
</script>

<template>
  <div class="relative mr-1 mb-2" :style="`width:${props.inputWidth}`">
    <label
      :for="inputId"
      class="absolute left-3 top-0 origin-left pointer-events-none transition-all duration-200 text-gray-500"
      :class="{
        'translate-y-2 scale-100': !isFocused && !isFilled,
        'translate-y-0 scale-75': isFocused || isFilled
      }"
      >{{ props.placeholder }}</label
    >
    <Input
      :id="inputId"
      class="pt-5 text-base"
      type="text"
      maxlength="64"
      v-model="inputValue"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </div>
</template>
