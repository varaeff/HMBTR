<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone, CalendarDate } from '@internationalized/date'
import { ChevronDownIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = defineProps<{
  placeholder: string
  date?: DateValue | undefined
}>()

const emit = defineEmits<{
  'update:date': [value: DateValue | undefined]
}>()
</script>

<template>
  <div class="flex flex-row gap-3">
    <Popover v-slot="{ close }">
      <PopoverTrigger as-child>
        <Button
          id="date"
          variant="outline"
          class="w-[50%] justify-between font-normal text-left bg-card"
          :class="{
            'text-muted-foreground': !date
          }"
        >
          {{ date ? date.toDate(getLocalTimeZone()).toLocaleDateString() : props.placeholder }}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto overflow-hidden p-0" align="start">
        <Calendar
          :model-value="date"
          :min-value="new CalendarDate(1960, 1, 1)"
          layout="month-and-year"
          @update:model-value="
            (value) => {
              emit('update:date', value)
              close()
            }
          "
        />
      </PopoverContent>
    </Popover>
  </div>
</template>
