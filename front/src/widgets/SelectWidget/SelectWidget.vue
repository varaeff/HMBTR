<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { computed } from 'vue'
import { tData } from '@/lib/utils'

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
  <Select v-model="selectedValue">
    <SelectTrigger class="w-[50%] mb-2 mr-2">
      <SelectValue :placeholder="props.placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="val in values" :key="val" :value="val"> {{ tData(val) }} </SelectItem>
    </SelectContent>
  </Select>
</template>
