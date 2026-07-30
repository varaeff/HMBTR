<script setup lang="ts">
import { TournamentCardsPanel } from '@/widgets/tournament/TournamentCardsPanel'
import { TournamentNominationTabs } from '@/widgets/tournament/TournamentNominationTabs'
import type { TournamentPageState } from '@/composables/useTournamentPage'

defineProps<{
  page: TournamentPageState
}>()
</script>

<template>
  <TournamentCardsPanel
    :tournament="page.tournament.data"
    :cards="page.cards.tournamentCards"
    :isOpen="page.cards.isCardsOpen"
    :canManage="page.permissions.canManageCards"
    :canDelete="page.permissions.canDeleteCards"
    :updateCard="page.actions.updateDisciplinaryCard"
    :deleteCard="page.actions.deleteDisciplinaryCard"
    :tournamentMarshals="page.marshalRegistration.tournamentMarshals"
    @update:isOpen="page.actions.setCardsOpen"
    @changed="page.actions.refreshCardsAndCompetition"
  />

  <TournamentNominationTabs
    :activeTab="page.nomination.activeTab"
    :isCompetitorsListOpen="page.nomination.isCompetitorsListOpen"
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
    :createDisciplinaryCard="page.actions.createDisciplinaryCard"
    :attachedCardCountByFightId="page.cards.attachedCardCountByFightId"
    :blockTitle="page.actions.blockTitle"
    :getBlockIsOpen="page.actions.getBlockIsOpen"
    :getOlympicPairsFixing="page.actions.getOlympicPairsFixing"
    :getRedCardGroupFighterKeys="page.actions.getRedCardGroupFighterKeys"
    @update:activeTab="page.actions.setActiveTab"
    @update:isCompetitorsListOpen="page.actions.setCompetitorsListOpen"
    @close-registration="page.actions.closeRegistration"
    @remove-competitor="page.actions.removeCompetitor"
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
    @update-block-open="page.actions.setBlockIsOpen"
    @update-fight-score="page.actions.updateFightScore"
    @update-groups="page.actions.updateGroups"
    @resolve-tie="page.actions.resolveTie"
    @swap-olympic-slots="page.actions.swapOlympicSlots"
    @fix-olympic-pairs="page.actions.fixOlympicPairs"
    @fix-olympic-round-results="page.actions.fixOlympicRoundResults"
    @cancel-olympic-round-results-fixation="page.actions.cancelOlympicRoundResultsFixation"
    @cancel-olympic-pair-fixation="page.actions.cancelOlympicPairFixation"
    @rollback-olympic-round="page.actions.rollbackOlympicRound"
    @rollback-olympic-pending-pairs="page.actions.rollbackOlympicPendingPairs"
  />
</template>
