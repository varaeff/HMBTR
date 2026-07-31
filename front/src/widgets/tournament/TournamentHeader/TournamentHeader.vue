<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { Tournament } from '@/model'

defineProps<{
  tournament: Tournament | null
  tournamentName: string
  tournamentDetails: string
  canShowAddJudgesButton: boolean
  canEdit: boolean
  allTournamentNominationsFinished: boolean
  isReportDownloading: boolean
}>()

const emit = defineEmits<{
  (e: 'add-judges'): void
  (e: 'download-report', language: 'en' | 'ru'): void
}>()
</script>

<template>
  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament">
    <h1 class="mb-4">{{ tournamentName }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournamentDetails }}
    </div>
    <div v-if="canShowAddJudgesButton" class="mt-4">
      <Button @click="emit('add-judges')">{{ $t('tournamentPageAddJudgesButton') }}</Button>
    </div>
    <div v-if="canEdit && allTournamentNominationsFinished" class="mt-4 flex flex-wrap gap-3">
      <Button :disabled="isReportDownloading" @click="emit('download-report', 'en')">
        <Download class="size-4" />
        PDF EN
      </Button>
      <Button :disabled="isReportDownloading" @click="emit('download-report', 'ru')">
        <Download class="size-4" />
        PDF RU
      </Button>
    </div>
  </div>
</template>
