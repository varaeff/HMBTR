<template>
  <div class="fieldset" :style="`width:${props.width}%`">
    <div
      class="field field--medium"
      :class="{ 'field--filled': isFilled, 'field--focus': isFocused }"
    >
      <label class="field__label">{{ props.placeholder }}</label>
      <input
        type="text"
        class="field__input"
        tabindex="4"
        maxlength="64"
        v-model="inputValue"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <div class="field__placeholder">{{ props.placeholder }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { defineEmits } from 'vue'
import { parseInput } from '@/features'

const props = defineProps({
  placeholder: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    required: false,
    default: 100
  },
  value: {
    type: String,
    required: false,
    default: ''
  }
})

const inputValue = ref(props.value)
const isFocused = ref(false)
const emit = defineEmits(['update:value'])

const isFilled = computed(() => inputValue.value.trim() !== '')

watch(inputValue, (newValue) => {
  inputValue.value = parseInput(newValue)
  if (inputValue.value === newValue) {
    emit('update:value', newValue)
  }
})

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}
</script>

<style scoped>
.fieldset {
  width: 50%;
  margin-right: 1rem;
}
</style>
