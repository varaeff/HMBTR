<template>
  <div class="fieldset fieldset--select">
    <div class="field field--medium">
      <label class="field__label">{{ props.placeholder }}</label>
      <select v-model="selectedValue" class="field__select">
        <option v-for="val in values" :key="val" :value="val">
          {{ val }}
        </option>
      </select>

      <div class="field__placeholder">
        {{ selectedValue.length ? selectedValue : props.placeholder }}
      </div>
      <span class="field-state--success">
        <svg xmlns="http://www.w3.org/2000/svg" width="26px" height="26px" viewBox="0 0 26 26">
          <path
            d="M5 12l5.02 4.9L21.15 4c.65-.66 1.71-.66 2.36 0 .65.67.65 1.74 0 2.4l-12.3 14.1c-.33.33-.76.5-1.18.5-.43 0-.86-.17-1.18-.5l-6.21-6.1c-.65-.66-.65-1.74 0-2.41.65-.65 1.71-.65 2.36.01z"
          ></path>
        </svg>
      </span>
      <span class="field-state--close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16">
          <path
            d="M15.6,15.5c-0.53,0.53-1.38,0.53-1.91,0L8.05,9.87L2.31,15.6c-0.53,0.53-1.38,0.53-1.91,0 c-0.53-0.53-0.53-1.38,0-1.9l5.65-5.64L0.4,2.4c-0.53-0.53-0.53-1.38,0-1.91c0.53-0.53,1.38-0.53,1.91,0l5.64,5.63l5.74-5.73 c0.53-0.53,1.38-0.53,1.91,0c0.53,0.53,0.53,1.38,0,1.91L9.94,7.94l5.66,5.65C16.12,14.12,16.12,14.97,15.6,15.5z"
          ></path>
        </svg>
      </span>
      <span class="field__arrow">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26">
          <path
            d="M7.85 10l5.02 4.9 5.27-4.9c.65-.66 1.71-.66 2.36 0 .65.67.65 1.74 0 2.4l-6.45 6.1c-.33.33-.76.5-1.18.5-.43 0-.86-.17-1.18-.5l-6.21-6.1c-.65-.66-.65-1.74 0-2.41.66-.65 1.72-.65 2.37.01z"
          ></path>
        </svg>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { defineEmits } from 'vue'

const props = defineProps({
  placeholder: {
    type: String,
    required: true
  },
  values: {
    type: Array as () => string[],
    required: false,
    default: () => []
  },
  value: {
    type: String,
    required: false,
    default: ''
  }
})

const selectedValue = ref(props.value)
const emit = defineEmits(['update:value'])

watch(selectedValue, (newValue) => {
  emit('update:value', newValue)
})
watch(
  () => props.value,
  (newValue) => (selectedValue.value = newValue)
)
</script>
