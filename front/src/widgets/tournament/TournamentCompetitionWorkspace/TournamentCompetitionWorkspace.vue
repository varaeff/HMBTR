<script setup lang="ts">
import { computed } from 'vue'
import { TournamentCardsPanel } from '@/widgets/tournament/TournamentCardsPanel'
import { TournamentNominationTabs } from '@/widgets/tournament/TournamentNominationTabs'
import type { TournamentPageState } from '@/composables/useTournamentPage'
import type {
  TournamentNominationTabsActions,
  TournamentNominationTabsCards,
  TournamentNominationTabsCompetitionOptions,
  TournamentNominationTabsPermissions,
  TournamentNominationTabsState
} from '@/widgets/tournament/types'

const props = defineProps<{
  page: TournamentPageState
}>()

const nominationTabsState = computed<TournamentNominationTabsState>(() => ({
  tournament: props.page.tournament.data,
  tournamentId: props.page.tournament.id,
  activeTab: props.page.nomination.activeTab,
  tournamentNominations: props.page.nomination.tournamentNominations,
  isNominationLoading: props.page.nomination.isNominationLoading,
  placements: props.page.competition.placements,
  nominationCompetitors: props.page.nomination.nominationCompetitors,
  isCompetitorsListOpen: props.page.nomination.isCompetitorsListOpen,
  isCurrentNominationOpen: props.page.nomination.isCurrentNominationOpen,
  hasTournamentMarshals: props.page.marshalRegistration.hasTournamentMarshals,
  blocks: props.page.competition.blocks,
  activeBlock: props.page.competition.activeBlock,
  pendingTie: props.page.competition.pendingTie,
  activeOlympicFinalResultsFixed: props.page.competition.activeOlympicFinalResultsFixed,
  nominationFinished: props.page.nomination.nominationFinished
}))

const nominationTabsPermissions = computed<TournamentNominationTabsPermissions>(() => ({
  canEditCompetition: props.page.permissions.canEditCompetition,
  canUseCompetitionBackwardActions: props.page.permissions.canUseCompetitionBackwardActions,
  canManageCards: props.page.permissions.canManageCards,
  canIssueCards: props.page.permissions.canIssueCards
}))

const nominationTabsCompetitionOptions = computed<TournamentNominationTabsCompetitionOptions>(
  () => ({
    canGenerateGroupFights: props.page.competition.canGenerateGroupFights,
    hasBlockingGroupAdvancementTie: props.page.competition.hasBlockingGroupAdvancementTie,
    olympicCompetitorIds: props.page.competition.olympicCompetitorIds,
    canOfferOlympic: props.page.competition.canOfferOlympic,
    canOfferOlympicWithThirdPlaces: props.page.competition.canOfferOlympicWithThirdPlaces
  })
)

const nominationTabsCards = computed<TournamentNominationTabsCards>(() => ({
  activeCardTypes: props.page.cards.activeCardTypes,
  cardIssueDate: props.page.cards.cardIssueDate,
  tournamentMarshals: props.page.marshalRegistration.tournamentMarshals,
  createDisciplinaryCard: props.page.actions.createDisciplinaryCard,
  attachedCardCountByFightId: props.page.cards.attachedCardCountByFightId
}))

const nominationTabsActions = computed<TournamentNominationTabsActions>(() => ({
  setActiveTab: props.page.actions.setActiveTab,
  setCompetitorsListOpen: props.page.actions.setCompetitorsListOpen,
  closeRegistration: props.page.actions.closeRegistration,
  removeCompetitor: props.page.actions.removeCompetitor,
  openRegistration: props.page.actions.openRegistration,
  createGroupBlock: props.page.actions.createGroupBlock,
  createOlympicBlock: props.page.actions.createOlympicBlock,
  generateGroupFights: props.page.actions.generateGroupFights,
  rollbackBlock: props.page.actions.rollbackBlock,
  fixGroupResults: props.page.actions.fixGroupResults,
  cancelGroupFightsFixation: props.page.actions.cancelGroupFightsFixation,
  cancelGroupResultsFixation: props.page.actions.cancelGroupResultsFixation,
  finishCompetition: props.page.actions.finishCompetition,
  refreshCardsAndCompetition: props.page.actions.refreshCardsAndCompetition,
  setBlockIsOpen: props.page.actions.setBlockIsOpen,
  updateFightScore: props.page.actions.updateFightScore,
  updateGroups: props.page.actions.updateGroups,
  resolveTie: props.page.actions.resolveTie,
  swapOlympicSlots: props.page.actions.swapOlympicSlots,
  fixOlympicPairs: props.page.actions.fixOlympicPairs,
  fixOlympicRoundResults: props.page.actions.fixOlympicRoundResults,
  cancelOlympicRoundResultsFixation: props.page.actions.cancelOlympicRoundResultsFixation,
  cancelOlympicPairFixation: props.page.actions.cancelOlympicPairFixation,
  rollbackOlympicRound: props.page.actions.rollbackOlympicRound,
  rollbackOlympicPendingPairs: props.page.actions.rollbackOlympicPendingPairs,
  blockTitle: props.page.actions.blockTitle,
  getBlockIsOpen: props.page.actions.getBlockIsOpen,
  getOlympicPairsFixing: props.page.actions.getOlympicPairsFixing,
  getRedCardGroupFighterKeys: props.page.actions.getRedCardGroupFighterKeys
}))
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
    :state="nominationTabsState"
    :permissions="nominationTabsPermissions"
    :competitionOptions="nominationTabsCompetitionOptions"
    :cards="nominationTabsCards"
    :actions="nominationTabsActions"
  />
</template>
