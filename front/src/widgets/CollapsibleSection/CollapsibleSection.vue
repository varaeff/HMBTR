<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  title: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
}>()

const toggle = (value: boolean) => {
  emit('update:isOpen', value)
}
</script>

<template>
  <Collapsible
    :open="isOpen"
    @update:open="toggle"
    class="group flex flex-col gap-2 border rounded-lg p-2"
  >
    <div class="flex items-center gap-4 px-4">
      <h4 class="text-sm font-semibold">{{ title }}</h4>
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="icon-sm">
          <ChevronDown class="transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <span class="sr-only">Toggle</span>
        </Button>
      </CollapsibleTrigger>
      <!-- Слот для кнопок в заголовке, если понадобятся -->
      <slot name="header-actions" />
    </div>

    <CollapsibleContent class="collapsible-section-content pt-2">
      <slot />
    </CollapsibleContent>
  </Collapsible>
</template>

<style scoped>
.collapsible-section-content {
  overflow: hidden;
}

.collapsible-section-content[data-state='open'] {
  animation: collapsible-section-open 220ms ease-out;
}

.collapsible-section-content[data-state='closed'] {
  animation: collapsible-section-close 180ms ease-in;
}

@keyframes collapsible-section-open {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--reka-collapsible-content-height);
    opacity: 1;
  }
}

@keyframes collapsible-section-close {
  from {
    height: var(--reka-collapsible-content-height);
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .collapsible-section-content[data-state='open'],
  .collapsible-section-content[data-state='closed'] {
    animation: none;
  }
}
</style>
