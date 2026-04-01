<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import type { Fighter } from '@/model'

const props = defineProps<{
  competitors: Fighter[]
  activeTab: number
  isOpen: boolean
  hasAccess: boolean
}>()

const emit = defineEmits<{
  (e: 'remove', id: number): void
  (e: 'close'): void
}>()

const showCloseBtn = computed(() => {
  return props.competitors.length > 1 && props.hasAccess && props.isOpen
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="competitor in competitors"
      :key="competitor.id"
      class="flex flex-col gap-1 p-1 border rounded-md"
    >
      <div class="flex justify-between items-center">
        <div class="flex gap-2">
          <div>{{ competitor.surname }} {{ competitor.name }}</div>
          <div class="text-muted-foreground">{{ competitor.city }} {{ competitor.club || '' }}</div>
        </div>

        <Button
          v-if="hasAccess && isOpen"
          variant="outline"
          size="sm"
          @click="emit('remove', competitor.id)"
        >
          {{ $t('tournamentPageRemoveCompetitorButton') }}
        </Button>
      </div>
    </div>
  </div>

  <div class="flex justify-end">
    <Button v-if="showCloseBtn" @click="emit('close')" variant="destructive" size="sm" class="mt-4">
      {{ $t('tournamentPageCloseRegistrationButton') }}
    </Button>
  </div>
  <div v-if="!props.isOpen" class="flex justify-center mt-4">
    {{ $t('tournamentPageRegistrationClosed') }}
  </div>
</template>
