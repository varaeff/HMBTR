<script setup lang="ts">
import { computed } from 'vue'
import { useTournamentPage } from '@/composables/useTournamentPage'
import { TournamentBackwardConfirmation } from '@/widgets/tournament/TournamentBackwardConfirmation'
import { TournamentCompetitionWorkspace } from '@/widgets/tournament/TournamentCompetitionWorkspace'
import { TournamentHeader } from '@/widgets/tournament/TournamentHeader'
import { TournamentMarshalRegistration } from '@/widgets/tournament/TournamentMarshalRegistration'
import { TournamentFighterRegistration } from '@/features/tournament-fighter-registration'

const props = defineProps<{
  id: string
}>()

const tournamentId = computed(() => +props.id)
const page = useTournamentPage(tournamentId)
</script>

<template>
  <TournamentBackwardConfirmation
    :confirmation="page.backwardConfirmation.confirmation"
    @confirm="page.actions.runConfirmedBackwardAction"
    @cancel="page.actions.closeBackwardConfirmation"
  />

  <TournamentHeader
    :tournament="page.tournament.data"
    :tournamentName="page.tournament.name"
    :tournamentDetails="page.tournament.details"
    :canShowAddJudgesButton="page.marshalRegistration.canShowAddJudgesButton"
    :canEdit="page.permissions.canEdit"
    :allTournamentNominationsFinished="page.nomination.allTournamentNominationsFinished"
    :isReportDownloading="page.report.isDownloading"
    @add-judges="page.actions.startMarshalRegistration"
    @download-report="page.actions.downloadTournamentReport"
  />

  <TournamentMarshalRegistration
    :tournament="page.tournament.data"
    :showSelector="page.marshalRegistration.showTournamentMarshalSelector"
    :canManage="page.permissions.canManageTournamentMarshals"
    @finished="page.actions.finishMarshalRegistration"
  />

  <TournamentFighterRegistration
    :tournament="page.tournament.data"
    :canShow="
      page.permissions.canEdit &&
      page.nomination.tournamentNominations.open.length > 0 &&
      !page.nomination.nominationFinished
    "
    :nominations="page.nomination.tournamentNominations.open"
  />

  <TournamentCompetitionWorkspace :page="page" />
</template>
