<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { CompetitionPodium } from '@/widgets/tournament/CompetitionPodium'
import { NominationCompetitors } from '@/widgets/tournament/NominationCompetitors'
import { TieResolver } from '@/widgets/tournament/TieResolver'
import { TournamentCompetitionBlock } from '@/widgets/tournament/TournamentCompetitionBlock'
import type {
  CompetitionBlock,
  CompetitionPlacement,
  Fighter,
  Group,
  Nomination,
  PendingTie,
  Tournament,
  TournamentMarshal
} from '@/model'
import type {
  ActiveCardTypes,
  FightScoreUpdatePayload,
  TournamentBlockOpenGetter,
  TournamentBlockTitleGetter,
  TournamentRedCardGroupKeyGetter
} from '@/widgets/tournament/types'

interface TournamentNominations {
  all: Nomination[]
  open: Nomination[]
}

const props = defineProps<{
  tournament: Tournament | null
  tournamentId: number
  activeTab: number
  tournamentNominations: TournamentNominations
  isNominationLoading: boolean
  placements: CompetitionPlacement[]
  nominationCompetitors: Fighter[]
  isCompetitorsListOpen: boolean
  activeCardTypes: ActiveCardTypes
  isCurrentNominationOpen: boolean
  hasTournamentMarshals: boolean
  blocks: CompetitionBlock[]
  activeBlock: CompetitionBlock | null
  pendingTie: PendingTie | null
  canEditCompetition: boolean
  canUseCompetitionBackwardActions: boolean
  canManageCards: boolean
  canGenerateGroupFights: boolean
  hasBlockingGroupAdvancementTie: boolean
  olympicCompetitorIds: Set<number>
  activeOlympicFinalResultsFixed: boolean
  nominationFinished: boolean
  canOfferOlympic: boolean
  canOfferOlympicWithThirdPlaces: boolean
  cardIssueDate: string
  tournamentMarshals: TournamentMarshal[]
  attachedCardCountByFightId: Record<number, number>
  blockTitle: TournamentBlockTitleGetter
  getBlockIsOpen: TournamentBlockOpenGetter
  getRedCardGroupFighterKeys: TournamentRedCardGroupKeyGetter
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', value: number): void
  (e: 'update:isCompetitorsListOpen', value: boolean): void
  (e: 'close-registration'): void
  (e: 'remove-competitor', fighterId: number, nominationId: number): void
  (e: 'open-registration'): void
  (e: 'create-group-block'): void
  (e: 'create-olympic-block', includeThirdPlaces?: boolean): void
  (e: 'generate-group-fights', blockId: number): void
  (e: 'rollback-block', blockId: number): void
  (e: 'fix-group-results', blockId: number): void
  (e: 'cancel-group-fights-fixation', blockId: number): void
  (e: 'cancel-group-results-fixation', blockId: number): void
  (e: 'finish-competition'): void
  (e: 'card-issued'): void
  (e: 'lifecycle-changed'): void
  (e: 'update-block-open', block: CompetitionBlock, isOpen: boolean): void
  (e: 'update-fight-score', payload: FightScoreUpdatePayload): void
  (e: 'update-groups', groups: Group[]): void
  (e: 'resolve-tie', pendingTie: PendingTie, orderedCompetitorIds: number[]): void
}>()

const { i18next } = useTranslation()

const activeTabModel = computed({
  get: () => props.activeTab,
  set: (value: string | number) => emit('update:activeTab', Number(value))
})

const competitorsListOpenModel = computed({
  get: () => props.isCompetitorsListOpen,
  set: (value: boolean) => emit('update:isCompetitorsListOpen', value)
})
</script>

<template>
  <Tabs v-if="tournament && tournamentNominations.all.length" v-model="activeTabModel" class="m-4">
    <div class="mb-4 overflow-x-auto pb-1">
      <TabsList
        class="inline-flex h-auto min-h-9 min-w-max md:grid md:w-full md:min-w-0"
        :style="{
          gridTemplateColumns: `repeat(${tournamentNominations.all.length}, minmax(0, 1fr))`
        }"
      >
        <TabsTrigger
          v-for="nom in tournamentNominations.all"
          :key="nom.id"
          :value="nom.id"
          class="min-w-36 flex-none cursor-pointer px-3 tracking-tight md:min-w-0 md:flex-1"
        >
          {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent :key="activeTab" :value="activeTab" class="mt-0 min-w-0">
      <template v-if="!isNominationLoading">
        <CompetitionPodium :placements="placements" />

        <CollapsibleSection
          v-if="nominationCompetitors.length"
          :title="$t('tournamentPageRegisteredFighters')"
          v-model:isOpen="competitorsListOpenModel"
        >
          <NominationCompetitors
            :competitors="nominationCompetitors"
            :activeTab="activeTab"
            :hasAccess="canEditCompetition"
            :isOpen="isCurrentNominationOpen"
            :hasBlocks="blocks.length > 0"
            :activeCardTypes="activeCardTypes"
            :canCloseRegistration="hasTournamentMarshals"
            :closeRegistrationHint="$t('tournamentPageAddJudgesHint')"
            @close="emit('close-registration')"
            @remove-competitor="(fighterId) => emit('remove-competitor', fighterId, activeTab)"
          />
        </CollapsibleSection>

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="canEditCompetition && !isCurrentNominationOpen && !blocks.length"
        >
          <Button @click="emit('open-registration')">
            {{ $t('tournamentPageOpenRegistrationButton') }}
          </Button>
          <Button v-if="nominationCompetitors.length >= 3" @click="emit('create-group-block')">
            {{ $t('tournamentPageCreateGroups') }}
          </Button>
          <Button v-if="canOfferOlympic" @click="emit('create-olympic-block')">
            {{ $t('tournamentPageOlympicBracket') }}
          </Button>
        </div>

        <div
          class="flex justify-center my-5 text-sm text-muted-foreground"
          v-if="
            canEditCompetition &&
            !isCurrentNominationOpen &&
            !blocks.length &&
            nominationCompetitors.length > 0 &&
            nominationCompetitors.length < 3
          "
        >
          At least 3 fighters are required.
        </div>

        <TournamentCompetitionBlock
          v-for="block in blocks"
          :key="block.id"
          :block="block"
          :title="blockTitle(block)"
          :isOpen="getBlockIsOpen(block)"
          :canEditCompetition="canEditCompetition"
          :canUseCompetitionBackwardActions="canUseCompetitionBackwardActions"
          :canManageCards="canManageCards"
          :canGenerateGroupFights="canGenerateGroupFights"
          :hasBlockingGroupAdvancementTie="hasBlockingGroupAdvancementTie"
          :pendingTie="pendingTie"
          :olympicCompetitorIds="olympicCompetitorIds"
          :redCardGroupFighterKeys="getRedCardGroupFighterKeys(block)"
          :tournamentId="tournamentId"
          :cardDate="cardIssueDate"
          :activeCardTypes="activeCardTypes"
          :tournamentMarshals="tournamentMarshals"
          :attachedCardCountByFightId="attachedCardCountByFightId"
          @update:isOpen="(isOpen) => emit('update-block-open', block, isOpen)"
          @generate-group-fights="(blockId) => emit('generate-group-fights', blockId)"
          @rollback-block="(blockId) => emit('rollback-block', blockId)"
          @fix-group-results="(blockId) => emit('fix-group-results', blockId)"
          @cancel-group-fights-fixation="
            (blockId) => emit('cancel-group-fights-fixation', blockId)
          "
          @cancel-group-results-fixation="
            (blockId) => emit('cancel-group-results-fixation', blockId)
          "
          @card-issued="emit('card-issued')"
          @lifecycle-changed="emit('lifecycle-changed')"
          @update-score="(payload) => emit('update-fight-score', payload)"
          @update-groups="(groups) => emit('update-groups', groups)"
        />

        <TieResolver
          v-if="canEditCompetition"
          :pendingTie="pendingTie"
          :blocks="blocks"
          @resolve-tie="
            (tie, orderedCompetitorIds) => emit('resolve-tie', tie, orderedCompetitorIds)
          "
        />

        <div
          v-if="canEditCompetition && activeOlympicFinalResultsFixed"
          class="flex justify-center my-5"
        >
          <Button @click="emit('finish-competition')">
            {{ $t('tournamentPageFixTournamentResults') }}
          </Button>
        </div>

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            canEditCompetition &&
            activeBlock?.type === 'GROUP' &&
            activeBlock.lifecycleState === 'RESULTS_FIXED' &&
            !hasBlockingGroupAdvancementTie &&
            !nominationFinished
          "
        >
          <Button v-if="activeBlock.groups.length === 1" @click="emit('finish-competition')">
            {{ $t('tournamentPageFixTournamentResults') }}
          </Button>
          <template v-else>
            <Button @click="emit('create-group-block')">
              {{ $t('tournamentPageNextSubgroups') }}
            </Button>
            <Button v-if="canOfferOlympic" @click="emit('create-olympic-block')">
              {{ $t('tournamentPageOlympicBracket') }}
            </Button>
            <Button
              v-if="canOfferOlympicWithThirdPlaces"
              @click="emit('create-olympic-block', true)"
            >
              {{ $t('tournamentPageOlympicBracketWithThirdPlaces') }}
            </Button>
          </template>
        </div>
      </template>
    </TabsContent>
  </Tabs>
</template>
