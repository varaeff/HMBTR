<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseInput } from '@/features/parseInput'

interface InputTextProps {
  placeholder: string
  width?: number
  value?: string
}

const props = withDefaults(defineProps<InputTextProps>(), {
  width: 100,
  value: ''
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)
const inputValue = ref(props.value)
const isFocused = ref(false)
const maxLength = 64

const isFilled = computed(() => inputValue.value.trim() !== '')

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
  <div class="fieldset" :style="`width:${props.width}%`">
    <div
      class="field field--medium"
      :class="{ 'field--filled': isFilled, 'field--focus': isFocused }"
    >
      <label :for="inputId" class="field__label">{{ props.placeholder }}</label>
      <input
        :id="inputId"
        type="text"
        class="field__input"
        :aria-label="props.placeholder"
        :maxlength="maxLength"
        v-model="inputValue"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <div class="field__placeholder">{{ props.placeholder }}</div>
    </div>
  </div>
</template>

<style scoped>
.fieldset {
  width: 50%;
  margin-right: 1rem;
}
</style>
