<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { FightsDisplay } from '@/widgets/tournament/FightsDisplay'
import { NominationGroups } from '@/widgets/tournament/NominationGroups'
import { OlympicBracket } from '@/widgets/tournament/OlympicBracket'
import { areFightResultsReady, canShowGroupFightActions } from '@/lib/fightResult'
import type { CompetitionBlock, PendingTie, TournamentMarshal } from '@/model'
import type { ActiveCardTypes } from '@/widgets/tournament/types'

const props = defineProps<{
  block: CompetitionBlock
  title: string
  isOpen: boolean
  canEditCompetition: boolean
  canUseCompetitionBackwardActions: boolean
  canManageCards: boolean
  canGenerateGroupFights: boolean
  hasBlockingGroupAdvancementTie: boolean
  pendingTie: PendingTie | null
  olympicCompetitorIds: Set<number>
  redCardGroupFighterKeys: Set<string>
  tournamentId: number
  cardDate: string
  activeCardTypes: ActiveCardTypes
  tournamentMarshals: TournamentMarshal[]
  attachedCardCountByFightId: Record<number, number>
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'generate-group-fights', blockId: number): void
  (e: 'rollback-block', blockId: number): void
  (e: 'fix-group-results', blockId: number): void
  (e: 'cancel-group-fights-fixation', blockId: number): void
  (e: 'cancel-group-results-fixation', blockId: number): void
  (e: 'card-issued'): void
  (e: 'lifecycle-changed'): void
}>()

const isGroupBlockComplete = computed(
  () => props.block.type === 'GROUP' && areFightResultsReady(props.block.fights)
)
</script>

<template>
  <section class="my-6">
    <CollapsibleSection
      :title="title"
      :isOpen="isOpen"
      @update:isOpen="(value) => emit('update:isOpen', value)"
    >
      <template v-if="block.type === 'GROUP'">
        <NominationGroups
          :groups="block.groups"
          :activeCardTypes="activeCardTypes"
          :redCardGroupFighterKeys="redCardGroupFighterKeys"
          :highlightedAdvancerCompetitorIds="olympicCompetitorIds"
          :isFixed="!canEditCompetition || block.status !== 'ACTIVE' || block.fights.length > 0"
        />
        <div class="mb-3 text-center text-sm text-muted-foreground">
          {{ $t(`tournamentPageLifecycle${block.lifecycleState}`) }}
        </div>
        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="canEditCompetition && block.status === 'ACTIVE' && block.fights.length === 0"
        >
          <Button
            :disabled="!canGenerateGroupFights"
            @click="emit('generate-group-fights', block.id)"
          >
            {{ $t('tournamentPageGenerateFights') }}
          </Button>
          <Button variant="destructive" @click="emit('rollback-block', block.id)">
            {{ $t('tournamentPageReturnPreviousStage') }}
          </Button>
        </div>
        <FightsDisplay
          v-if="block.fightsBlocks.length"
          :blockId="block.id"
          :blocksData="block.fightsBlocks"
          :hasAccess="
            canEditCompetition &&
            block.status === 'ACTIVE' &&
            block.lifecycleState === 'FIGHTS_EDITABLE'
          "
          :canIssueCards="
            canManageCards &&
            block.status === 'ACTIVE' &&
            block.lifecycleState === 'FIGHTS_EDITABLE'
          "
          :tournamentId="tournamentId"
          :cardDate="cardDate"
          :activeCardTypes="activeCardTypes"
          :tournamentMarshals="tournamentMarshals"
          @card-issued="emit('card-issued')"
        />
        <div
          v-if="
            (canEditCompetition || canUseCompetitionBackwardActions) &&
            canShowGroupFightActions(block, pendingTie)
          "
          class="flex flex-wrap justify-center gap-3 my-5"
        >
          <Button
            v-if="canEditCompetition"
            :disabled="!isGroupBlockComplete || hasBlockingGroupAdvancementTie"
            @click="emit('fix-group-results', block.id)"
          >
            {{ $t('tournamentPageFixResults') }}
          </Button>
          <Button
            v-if="canUseCompetitionBackwardActions"
            variant="destructive"
            @click="emit('cancel-group-fights-fixation', block.id)"
          >
            {{ $t('tournamentPageCancelGroupFixation') }}
          </Button>
        </div>
        <div
          v-if="
            canUseCompetitionBackwardActions &&
            block.status === 'ACTIVE' &&
            block.lifecycleState === 'RESULTS_FIXED'
          "
          class="flex justify-center my-5"
        >
          <Button variant="destructive" @click="emit('cancel-group-results-fixation', block.id)">
            {{ $t('tournamentPageCancelResultsFixation') }}
          </Button>
        </div>
      </template>

      <OlympicBracket
        v-else
        :block="block"
        :hasAccess="canEditCompetition && block.status === 'ACTIVE'"
        :canUseBackwardActions="canUseCompetitionBackwardActions && block.status === 'ACTIVE'"
        :canIssueCards="canManageCards"
        :tournamentId="tournamentId"
        :cardDate="cardDate"
        :activeCardTypes="activeCardTypes"
        :tournamentMarshals="tournamentMarshals"
        :attachedCardCountByFightId="attachedCardCountByFightId"
        @card-issued="emit('card-issued')"
        @lifecycle-changed="emit('lifecycle-changed')"
      />
    </CollapsibleSection>
  </section>
</template>
