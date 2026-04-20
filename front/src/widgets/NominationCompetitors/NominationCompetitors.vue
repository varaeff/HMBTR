<script setup lang="ts">
import { computed, ref } from 'vue'
import { tData } from '@/lib/utils'
import { useCompetitionStore } from '@/stores/competition'
import { Button } from '@/components/ui/button'
import type { Fighter } from '@/model'

const props = defineProps<{
  competitors: Fighter[]
  activeTab: number
  isOpen: boolean
  hasAccess: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const competitionStore = useCompetitionStore()

const isPending = ref(false)

const handleClose = async () => {
  try {
    isPending.value = true
    emit('close')
  } finally {
    isPending.value = false
  }
}

const showCloseBtn = computed(() => {
  return props.competitors.length > 2 && props.hasAccess && props.isOpen
})

const removeCompetitor = async (fighterId: number) => {
  const competitor = competitionStore.tournamentCompetitors.find(
    (c) => c.fighter_id === fighterId && c.nomination_id === props.activeTab
  )

  if (competitor) {
    await competitionStore.deleteCompetitor(competitor.id)
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(competitor, index) in competitors"
      :key="competitor.id"
      class="flex flex-col gap-1 p-1 border rounded-md"
    >
      <div class="flex justify-between items-center">
        <div class="flex gap-2">
          <div>{{ index + 1 }}. {{ tData(competitor.surname) }} {{ tData(competitor.name) }}</div>
          <div class="text-muted-foreground">
            {{ tData(competitor.city) }} {{ tData(competitor.club || '') }}
          </div>
        </div>

        <Button
          v-if="hasAccess && isOpen"
          :disabled="isPending"
          variant="outline"
          size="sm"
          @click="removeCompetitor(competitor.id)"
        >
          {{ $t('tournamentPageRemoveCompetitorButton') }}
        </Button>
      </div>
    </div>
  </div>

  <div class="flex justify-end">
    <Button
      v-if="showCloseBtn"
      :disabled="isPending"
      @click="handleClose"
      variant="destructive"
      size="sm"
      class="mt-4"
    >
      {{ $t('tournamentPageCloseRegistrationButton') }}
    </Button>
  </div>
  <div v-if="!props.isOpen" class="flex justify-center mt-4">
    {{ $t('tournamentPageRegistrationClosed') }}
  </div>
</template>
