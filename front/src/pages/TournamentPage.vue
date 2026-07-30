<script setup lang="ts">
import { computed } from 'vue'
import { useTournamentPage } from '@/composables/useTournamentPage'
import { TournamentBackwardConfirmation } from '@/widgets/tournament/TournamentBackwardConfirmation'
import { TournamentCardsPanel } from '@/widgets/tournament/TournamentCardsPanel'
import { TournamentFighterRegistration } from '@/widgets/tournament/TournamentFighterRegistration'
import { TournamentHeader } from '@/widgets/tournament/TournamentHeader'
import { TournamentMarshalRegistration } from '@/widgets/tournament/TournamentMarshalRegistration'
import { TournamentNominationTabs } from '@/widgets/tournament/TournamentNominationTabs'

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

  <TournamentCardsPanel
    v-model:isOpen="page.cards.isCardsOpen"
    :tournament="page.tournament.data"
    :cards="page.cards.tournamentCards"
    :canManage="page.permissions.canManageCards"
    :canDelete="page.permissions.canDeleteCards"
    :tournamentMarshals="page.marshalRegistration.tournamentMarshals"
    @changed="page.actions.refreshCardsAndCompetition"
  />

  <TournamentNominationTabs
    v-model:activeTab="page.nomination.activeTab"
    v-model:isCompetitorsListOpen="page.nomination.isCompetitorsListOpen"
    :tournament="page.tournament.data"
    :tournamentId="page.tournament.id"
    :tournamentNominations="page.nomination.tournamentNominations"
    :isNominationLoading="page.nomination.isNominationLoading"
    :placements="page.competition.placements"
    :nominationCompetitors="page.nomination.nominationCompetitors"
    :activeCardTypes="page.cards.activeCardTypes"
    :isCurrentNominationOpen="page.nomination.isCurrentNominationOpen"
    :hasTournamentMarshals="page.marshalRegistration.hasTournamentMarshals"
    :blocks="page.competition.blocks"
    :activeBlock="page.competition.activeBlock"
    :pendingTie="page.competition.pendingTie"
    :canEditCompetition="page.permissions.canEditCompetition"
    :canUseCompetitionBackwardActions="page.permissions.canUseCompetitionBackwardActions"
    :canManageCards="page.permissions.canManageCards"
    :canGenerateGroupFights="page.competition.canGenerateGroupFights"
    :hasBlockingGroupAdvancementTie="page.competition.hasBlockingGroupAdvancementTie"
    :olympicCompetitorIds="page.competition.olympicCompetitorIds"
    :activeOlympicFinalResultsFixed="page.competition.activeOlympicFinalResultsFixed"
    :nominationFinished="page.nomination.nominationFinished"
    :canOfferOlympic="page.competition.canOfferOlympic"
    :canOfferOlympicWithThirdPlaces="page.competition.canOfferOlympicWithThirdPlaces"
    :cardIssueDate="page.cards.cardIssueDate"
    :tournamentMarshals="page.marshalRegistration.tournamentMarshals"
    :attachedCardCountByFightId="page.cards.attachedCardCountByFightId"
    :blockTitle="page.actions.blockTitle"
    :getBlockIsOpen="page.actions.getBlockIsOpen"
    :getRedCardGroupFighterKeys="page.actions.getRedCardGroupFighterKeys"
    @close-registration="page.actions.closeRegistration"
    @open-registration="page.actions.openRegistration"
    @create-group-block="page.actions.createGroupBlock"
    @create-olympic-block="page.actions.createOlympicBlock"
    @generate-group-fights="page.actions.generateGroupFights"
    @rollback-block="page.actions.rollbackBlock"
    @fix-group-results="page.actions.fixGroupResults"
    @cancel-group-fights-fixation="page.actions.cancelGroupFightsFixation"
    @cancel-group-results-fixation="page.actions.cancelGroupResultsFixation"
    @finish-competition="page.actions.finishCompetition"
    @card-issued="page.actions.refreshCardsAndCompetition"
    @lifecycle-changed="page.actions.refreshCardsAndCompetition"
    @update-block-open="page.actions.setBlockIsOpen"
  />
</template>
