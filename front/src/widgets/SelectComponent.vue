<script setup lang="ts">
import ArrowIcon from '@/shared/icons/ArrowIcon.vue'
import { computed } from 'vue'

interface Props {
  placeholder: string
  values: string[]
  value: string
}

const props = withDefaults(defineProps<Props>(), {
  values: () => [],
  value: ''
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const selectedValue = computed({
  get: () => props.value,
  set: (value) => emit('update:value', value)
})
</script>

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
      <ArrowIcon class="field__arrow-icon" />
    </div>
  </div>
</template>
