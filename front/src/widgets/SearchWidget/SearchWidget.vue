<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { cn, parseInput } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DynamicLabeledInput } from '@/widgets/DynamicLabeledInput'

interface SearchStore {
  setSearchString: (searchString: string) => void
}

interface SearchWidgetProps {
  placeholder: string
  store: () => SearchStore
  inputType?: string
  addLabel?: string
  showAddButton?: boolean
  addAction?: () => void
}

const props = withDefaults(defineProps<SearchWidgetProps>(), {
  inputType: 'text',
  addLabel: '',
  showAddButton: false,
  addAction: undefined
})

const inputValue = ref('')
const store = props.store()
const isInputEmpty = computed(() => inputValue.value.trim().length === 0)
const hasAddButton = computed(() => props.showAddButton && Boolean(props.addAction))

watch(inputValue, (newValue) => {
  inputValue.value = parseInput(newValue, props.inputType)
  if (inputValue.value === newValue) {
    store.setSearchString(newValue)
  }
})
</script>

<template>
  <div class="flex w-full flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-start">
    <div class="flex min-w-0 flex-1 items-start">
      <DynamicLabeledInput
        :class="cn('min-w-0', hasAddButton && 'rounded-r-none border-r-0')"
        wrapperClass="mb-0 mr-0 min-w-0 flex-1"
        :placeholder="props.placeholder"
        v-model:value="inputValue"
      />
      <Button
        v-if="hasAddButton && props.addAction"
        class="h-9 min-w-12 rounded-l-none"
        variant="default"
        size="default"
        :disabled="isInputEmpty"
        @click="props.addAction"
      >
        {{ props.addLabel }}
      </Button>
    </div>
    <Button
      class="h-9 min-w-20"
      variant="default"
      size="default"
      @click="inputValue = ''"
    >
      {{ $t('searchClear') }}
    </Button>
  </div>
</template>
