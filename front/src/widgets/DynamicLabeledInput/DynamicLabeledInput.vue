<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseInput } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const props = defineProps({
  placeholder: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: '',
    required: false
  },
  inputType: {
    type: String,
    default: 'text',
    required: false
  }
})

defineOptions({
  inheritAttrs: false
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
    emit('update:value', newValue)
  }
)

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}

const handleBeforeInput = (e: InputEvent) => {
  if (e.data) {
    const filtered = parseInput(e.data, props.inputType)
    if (filtered !== e.data) {
      e.preventDefault()
    }
  }
}

const handlePaste = (e: ClipboardEvent) => {
  if (props.inputType !== 'email') {
    e.preventDefault()
    return
  }

  const pastedText = e.clipboardData?.getData('text') || ''
  const filtered = parseInput(pastedText, 'email')

  if (filtered !== pastedText) {
    e.preventDefault()

    const input = e.target as HTMLInputElement
    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0

    inputValue.value =
      inputValue.value.substring(0, start) + filtered + inputValue.value.substring(end)
  }
}
</script>

<template>
  <div class="w-full relative mr-1 mb-2">
    <label
      :for="inputId"
      class="absolute left-3 bottom-4 origin-left pointer-events-none transition-all duration-200 text-gray-500"
      :class="{
        'translate-y-2 scale-100': !isFocused && !isFilled,
        'translate-y-0 scale-75': isFocused || isFilled
      }"
      >{{ props.placeholder }}</label
    >
    <Input
      :id="inputId"
      class="pt-5 text-base"
      :type="props.inputType"
      maxlength="64"
      v-bind="$attrs"
      v-model="inputValue"
      @beforeinput="handleBeforeInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @paste="handlePaste"
    />
  </div>
</template>
