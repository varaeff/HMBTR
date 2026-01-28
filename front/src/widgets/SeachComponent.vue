<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseInput } from '@/features/parseInput'

const props = defineProps({
  placeholder: {
    type: String,
    reqired: true
  },
  clearBtn: {
    type: Boolean,
    reqired: false,
    default: false
  },
  btnTitle: {
    type: String,
    reqired: false,
    default: ''
  },
  width: {
    type: Number,
    reqired: false,
    default: 100
  },
  store: {
    type: Function,
    required: true
  }
})

const inputValue = ref('')
const isFocused = ref(false)

const isFilled = computed(() => inputValue.value.trim() !== '')

const store = props.store()

watch(inputValue, (newValue) => {
  inputValue.value = parseInput(newValue)
  if (inputValue.value === newValue) {
    store.$state.seachString = newValue
  }
})

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
  <button v-if="props.clearBtn" class="btn btn-default btn-medium" @click="inputValue = ''">
    {{ props.btnTitle }}
  </button>
</template>

<style scoped>
.fieldset {
  width: 50%;
  margin-right: 1rem;
}
</style>
