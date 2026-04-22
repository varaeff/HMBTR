<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown } from 'lucide-vue-next'

defineProps<{
  title: string
  isOpen: boolean
}>()

const emit = defineEmits(['update:isOpen'])

const toggle = (value: boolean) => {
  emit('update:isOpen', value)
}
</script>

<template>
  <Collapsible
    :open="isOpen"
    @update:open="toggle"
    class="flex flex-col gap-2 border rounded-lg p-2"
  >
    <div class="flex items-center gap-4 px-4">
      <h4 class="text-sm font-semibold">{{ title }}</h4>
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="icon" class="size-8">
          <ChevronsUpDown class="size-4" />
          <span class="sr-only">Toggle</span>
        </Button>
      </CollapsibleTrigger>
      <!-- Слот для кнопок в заголовке, если понадобятся -->
      <slot name="header-actions" />
    </div>

    <CollapsibleContent class="pt-2">
      <slot />
    </CollapsibleContent>
  </Collapsible>
</template>
