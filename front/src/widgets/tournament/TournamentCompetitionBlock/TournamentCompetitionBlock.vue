<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { FightsDisplay } from '@/widgets/tournament/FightsDisplay'
import { NominationGroups } from '@/widgets/tournament/NominationGroups'
import { OlympicBracket } from '@/widgets/tournament/OlympicBracket'
import { areFightResultsReady, canShowGroupFightActions } from '@/lib/fightResult'
import type {
  TournamentCompetitionBlockActions,
  TournamentCompetitionBlockCards,
  TournamentCompetitionBlockOptions,
  TournamentCompetitionBlockPermissions,
  TournamentCompetitionBlockState
} from '@/widgets/tournament/types'

const props = defineProps<{
  state: TournamentCompetitionBlockState
  permissions: TournamentCompetitionBlockPermissions
  options: TournamentCompetitionBlockOptions
  cards: TournamentCompetitionBlockCards
  actions: TournamentCompetitionBlockActions
}>()

const isGroupBlockComplete = computed(
  () => props.state.block.type === 'GROUP' && areFightResultsReady(props.state.block.fights)
)
</script>

<template>
  <section class="my-6">
    <CollapsibleSection
      :title="state.title"
      :isOpen="state.isOpen"
      @update:isOpen="actions.setOpen"
    >
      <template v-if="state.block.type === 'GROUP'">
        <NominationGroups
          :groups="state.block.groups"
          :activeCardTypes="cards.activeCardTypes"
          :redCardGroupFighterKeys="state.redCardGroupFighterKeys"
          :highlightedAdvancerCompetitorIds="options.olympicCompetitorIds"
          :isFixed="
            !permissions.canEditCompetition ||
            state.block.status !== 'ACTIVE' ||
            state.block.fights.length > 0
          "
          @update-groups="actions.updateGroups"
        />
        <div class="mb-3 text-center text-sm text-muted-foreground">
          {{ $t(`tournamentPageLifecycle${state.block.lifecycleState}`) }}
        </div>
        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            permissions.canEditCompetition &&
            state.block.status === 'ACTIVE' &&
            state.block.fights.length === 0
          "
        >
          <Button
            :disabled="!options.canGenerateGroupFights"
            @click="actions.generateGroupFights(state.block.id)"
          >
            {{ $t('tournamentPageGenerateFights') }}
          </Button>
          <Button variant="destructive" @click="actions.rollbackBlock(state.block.id)">
            {{ $t('tournamentPageReturnPreviousStage') }}
          </Button>
        </div>
        <FightsDisplay
          v-if="state.block.fightsBlocks.length"
          :blockId="state.block.id"
          :blocksData="state.block.fightsBlocks"
          :hasAccess="
            permissions.canEditCompetition &&
            state.block.status === 'ACTIVE' &&
            state.block.lifecycleState === 'FIGHTS_EDITABLE'
          "
          :canIssueCards="
            permissions.canManageCards &&
            state.block.status === 'ACTIVE' &&
            state.block.lifecycleState === 'FIGHTS_EDITABLE'
          "
          :tournamentId="state.tournamentId"
          :cardDate="cards.cardIssueDate"
          :activeCardTypes="cards.activeCardTypes"
          :tournamentMarshals="cards.tournamentMarshals"
          :createDisciplinaryCard="cards.createDisciplinaryCard"
          @update-score="actions.updateFightScore"
          @card-issued="actions.refreshCardsAndCompetition"
        />
        <div
          v-if="
            (permissions.canEditCompetition || permissions.canUseCompetitionBackwardActions) &&
            canShowGroupFightActions(state.block, state.pendingTie)
          "
          class="flex flex-wrap justify-center gap-3 my-5"
        >
          <Button
            v-if="permissions.canEditCompetition"
            :disabled="!isGroupBlockComplete || options.hasBlockingGroupAdvancementTie"
            @click="actions.fixGroupResults(state.block.id)"
          >
            {{ $t('tournamentPageFixResults') }}
          </Button>
          <Button
            v-if="permissions.canUseCompetitionBackwardActions"
            variant="destructive"
            @click="actions.cancelGroupFightsFixation(state.block.id)"
          >
            {{ $t('tournamentPageCancelGroupFixation') }}
          </Button>
        </div>
        <div
          v-if="
            permissions.canUseCompetitionBackwardActions &&
            state.block.status === 'ACTIVE' &&
            state.block.lifecycleState === 'RESULTS_FIXED'
          "
          class="flex justify-center my-5"
        >
          <Button
            variant="destructive"
            @click="actions.cancelGroupResultsFixation(state.block.id)"
          >
            {{ $t('tournamentPageCancelResultsFixation') }}
          </Button>
        </div>
      </template>

      <OlympicBracket
        v-else
        :block="state.block"
        :hasAccess="permissions.canEditCompetition && state.block.status === 'ACTIVE'"
        :canUseBackwardActions="
          permissions.canUseCompetitionBackwardActions && state.block.status === 'ACTIVE'
        "
        :canIssueCards="permissions.canManageCards"
        :tournamentId="state.tournamentId"
        :cardDate="cards.cardIssueDate"
        :activeCardTypes="cards.activeCardTypes"
        :tournamentMarshals="cards.tournamentMarshals"
        :createDisciplinaryCard="cards.createDisciplinaryCard"
        :attachedCardCountByFightId="cards.attachedCardCountByFightId"
        :isFixingPairs="state.isOlympicPairsFixing"
        @card-issued="actions.refreshCardsAndCompetition"
        @update-score="actions.updateFightScore"
        @swap-slots="actions.swapOlympicSlots"
        @fix-pairs="actions.fixOlympicPairs"
        @fix-round-results="actions.fixOlympicRoundResults"
        @cancel-round-results-fixation="actions.cancelOlympicRoundResultsFixation"
        @cancel-pair-fixation="actions.cancelOlympicPairFixation"
        @rollback-round="actions.rollbackOlympicRound"
        @rollback-pending-pairs="actions.rollbackOlympicPendingPairs"
      />
    </CollapsibleSection>
  </section>
</template>
