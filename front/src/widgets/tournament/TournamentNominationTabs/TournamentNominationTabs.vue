<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { CompetitionPodium } from '@/widgets/tournament/CompetitionPodium'
import { NominationCompetitors } from '@/widgets/tournament/NominationCompetitors'
import { TieResolver } from '@/widgets/tournament/TieResolver'
import { TournamentCompetitionBlock } from '@/widgets/tournament/TournamentCompetitionBlock'
import type { CompetitionBlock } from '@/model'
import type {
  TournamentCompetitionBlockActions,
  TournamentCompetitionBlockCards,
  TournamentCompetitionBlockOptions,
  TournamentCompetitionBlockPermissions,
  TournamentCompetitionBlockState,
  TournamentNominationTabsActions,
  TournamentNominationTabsCards,
  TournamentNominationTabsCompetitionOptions,
  TournamentNominationTabsPermissions,
  TournamentNominationTabsState
} from '@/widgets/tournament/types'
import { tData } from '@/lib/utils'

const props = defineProps<{
  state: TournamentNominationTabsState
  permissions: TournamentNominationTabsPermissions
  competitionOptions: TournamentNominationTabsCompetitionOptions
  cards: TournamentNominationTabsCards
  actions: TournamentNominationTabsActions
}>()

const { i18next } = useTranslation()
const isRussiaHmbDialogOpen = ref(false)
const isRussiaHmbCalculating = ref(false)
const selectedRussiaHmbCoefficient = ref<'1' | '2' | '4'>('1')

const activeTabModel = computed({
  get: () => props.state.activeTab,
  set: (value: string | number) => props.actions.setActiveTab(Number(value))
})

const competitorsListOpenModel = computed({
  get: () => props.state.isCompetitorsListOpen,
  set: (value: boolean) => props.actions.setCompetitorsListOpen(value)
})

const canDeleteCurrentNomination = computed(
  () =>
    props.permissions.canEditCompetition &&
    props.state.nominationCompetitors.length === 0 &&
    props.state.tournamentNominations.all.length > 1
)

const showCompetitorsSection = computed(
  () => props.state.nominationCompetitors.length > 0 || canDeleteCurrentNomination.value
)

const canShowRussiaHmbAction = computed(
  () =>
    props.state.nominationFinished &&
    (Boolean(props.state.russiaHmbRating) || props.permissions.canCalculateRussiaHmbRating)
)

const coefficientValue = () => {
  if (selectedRussiaHmbCoefficient.value === '2') return 2
  if (selectedRussiaHmbCoefficient.value === '4') return 4
  return 1
}

const fighterName = (result: NonNullable<TournamentNominationTabsState['russiaHmbRating']>['results'][number]) =>
  [result.fighter.surname, result.fighter.name, result.fighter.patronymic]
    .filter((part): part is string => Boolean(part))
    .map((part) => tData(part, i18next.language))
    .join(' ')

const calculateRussiaHmbRating = async () => {
  isRussiaHmbCalculating.value = true
  try {
    await props.actions.calculateRussiaHmbRating(coefficientValue())
  } finally {
    isRussiaHmbCalculating.value = false
  }
}

const blockState = (block: CompetitionBlock): TournamentCompetitionBlockState => ({
  block,
  title: props.actions.blockTitle(block),
  isOpen: props.actions.getBlockIsOpen(block),
  pendingTie: props.state.pendingTie,
  redCardGroupFighterKeys: props.actions.getRedCardGroupFighterKeys(block),
  tournamentId: props.state.tournamentId,
  isOlympicPairsFixing: props.actions.getOlympicPairsFixing(block)
})

const blockPermissions = computed<TournamentCompetitionBlockPermissions>(() => ({
  canEditCompetition: props.permissions.canEditCompetition,
  canUseCompetitionBackwardActions: props.permissions.canUseCompetitionBackwardActions,
  canManageCards: props.permissions.canManageCards,
  canIssueCards: props.permissions.canIssueCards
}))

const blockOptions = computed<TournamentCompetitionBlockOptions>(() => ({
  canGenerateGroupFights: props.competitionOptions.canGenerateGroupFights,
  hasBlockingGroupAdvancementTie: props.competitionOptions.hasBlockingGroupAdvancementTie,
  olympicCompetitorIds: props.competitionOptions.olympicCompetitorIds
}))

const blockCards = computed<TournamentCompetitionBlockCards>(() => ({
  cardIssueDate: props.cards.cardIssueDate,
  activeCardTypes: props.cards.activeCardTypes,
  tournamentMarshals: props.cards.tournamentMarshals,
  createDisciplinaryCard: props.cards.createDisciplinaryCard,
  createWithdrawal: props.actions.createFightWithdrawal,
  cancelWithdrawal: props.actions.cancelWithdrawal,
  attachedCardCountByFightId: props.cards.attachedCardCountByFightId
}))

const blockActions = (block: CompetitionBlock): TournamentCompetitionBlockActions => ({
  setOpen: (isOpen) => props.actions.setBlockIsOpen(block, isOpen),
  generateGroupFights: props.actions.generateGroupFights,
  rollbackBlock: props.actions.rollbackBlock,
  fixGroupResults: props.actions.fixGroupResults,
  cancelGroupFightsFixation: props.actions.cancelGroupFightsFixation,
  cancelGroupResultsFixation: props.actions.cancelGroupResultsFixation,
  refreshCardsAndCompetition: props.actions.refreshCardsAndCompetition,
  updateFightScore: props.actions.updateFightScore,
  updateGroups: props.actions.updateGroups,
  swapOlympicSlots: props.actions.swapOlympicSlots,
  fixOlympicPairs: props.actions.fixOlympicPairs,
  fixOlympicRoundResults: props.actions.fixOlympicRoundResults,
  cancelOlympicRoundResultsFixation: props.actions.cancelOlympicRoundResultsFixation,
  cancelOlympicPairFixation: props.actions.cancelOlympicPairFixation,
  rollbackOlympicRound: props.actions.rollbackOlympicRound,
  rollbackOlympicPendingPairs: props.actions.rollbackOlympicPendingPairs
})
</script>

<template>
  <Tabs
    v-if="state.tournament && state.tournamentNominations.all.length"
    v-model="activeTabModel"
    class="m-4"
  >
    <div class="mb-4 overflow-x-auto pb-1">
      <TabsList
        class="inline-flex h-auto min-h-9 min-w-max md:grid md:w-full md:min-w-0"
        :style="{
          gridTemplateColumns: `repeat(${state.tournamentNominations.all.length}, minmax(0, 1fr))`
        }"
      >
        <TabsTrigger
          v-for="nom in state.tournamentNominations.all"
          :key="nom.id"
          :value="nom.id"
          class="min-w-36 flex-none cursor-pointer px-3 tracking-tight md:min-w-0 md:flex-1"
        >
          {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent :key="state.activeTab" :value="state.activeTab" class="mt-0 min-w-0">
      <template v-if="!state.isNominationLoading">
        <CompetitionPodium :placements="state.placements" />

        <div v-if="canShowRussiaHmbAction" class="mb-6 flex justify-center">
          <Button @click="isRussiaHmbDialogOpen = true">
            {{
              state.russiaHmbRating
                ? $t('tournamentPageRussiaHmbRating')
                : $t('tournamentPageCalculateRussiaHmbRating')
            }}
          </Button>
        </div>

        <Dialog v-model:open="isRussiaHmbDialogOpen">
          <DialogContent>
            <template v-if="state.russiaHmbRating">
              <DialogHeader>
                <DialogTitle class="text-center">
                  {{ $t('tournamentPageRussiaHmbRating') }}
                </DialogTitle>
                <p class="text-center text-sm text-muted-foreground">
                  {{
                    $t('tournamentPageRussiaHmbNominationCoefficient', {
                      coefficient: state.russiaHmbRating.calculation.coefficient
                    })
                  }}
                </p>
              </DialogHeader>
              <div class="max-h-96 overflow-auto rounded-md border">
                <div
                  v-for="(result, index) in state.russiaHmbRating.results"
                  :key="result.id"
                  class="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <span class="font-medium">{{ index + 1 }}</span>
                  <span>{{ fighterName(result) }}</span>
                  <span class="text-right font-semibold">{{ result.points }}</span>
                </div>
              </div>
              <DialogFooter>
                <Button class="w-full" @click="isRussiaHmbDialogOpen = false">
                  {{ $t('tournamentPageCloseWindow') }}
                </Button>
              </DialogFooter>
            </template>
            <template v-else>
              <div class="flex items-center justify-center gap-3">
                <label class="text-sm font-medium" for="russia-hmb-coefficient">
                  {{ $t('tournamentPageRussiaHmbCoefficient') }}
                </label>
                <NativeSelect
                  id="russia-hmb-coefficient"
                  v-model="selectedRussiaHmbCoefficient"
                  class="w-24"
                >
                  <NativeSelectOption value="1">1</NativeSelectOption>
                  <NativeSelectOption value="2">2</NativeSelectOption>
                  <NativeSelectOption value="4">4</NativeSelectOption>
                </NativeSelect>
              </div>
              <DialogFooter>
                <Button
                  class="w-full"
                  :disabled="isRussiaHmbCalculating"
                  @click="calculateRussiaHmbRating"
                >
                  {{ $t('tournamentPageMakeRussiaHmbCalculation') }}
                </Button>
              </DialogFooter>
            </template>
          </DialogContent>
        </Dialog>

        <CollapsibleSection
          v-if="showCompetitorsSection"
          :title="$t('tournamentPageRegisteredFighters')"
          v-model:isOpen="competitorsListOpenModel"
        >
          <NominationCompetitors
            :competitors="state.nominationCompetitors"
            :activeTab="state.activeTab"
            :hasAccess="permissions.canEditCompetition"
            :isOpen="state.isCurrentNominationOpen"
            :hasBlocks="state.blocks.length > 0"
            :activeCardTypes="cards.activeCardTypes"
            :canCloseRegistration="state.hasTournamentMarshals"
            :canDeleteNomination="canDeleteCurrentNomination"
            :closeRegistrationHint="$t('tournamentPageAddJudgesHint')"
            @close="actions.closeRegistration"
            @delete-nomination="actions.deleteNomination"
            @remove-competitor="
              (fighterId) => actions.removeCompetitor(fighterId, state.activeTab)
            "
            @no-show-competitor="actions.createNoShowWithdrawal"
          />
        </CollapsibleSection>

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            permissions.canEditCompetition && !state.isCurrentNominationOpen && !state.blocks.length
          "
        >
          <Button @click="actions.openRegistration">
            {{ $t('tournamentPageOpenRegistrationButton') }}
          </Button>
          <Button
            v-if="state.nominationCompetitors.length >= 3"
            @click="actions.createGroupBlock"
          >
            {{ $t('tournamentPageCreateGroups') }}
          </Button>
          <Button
            v-if="competitionOptions.canOfferOlympic"
            @click="actions.createOlympicBlock()"
          >
            {{ $t('tournamentPageOlympicBracket') }}
          </Button>
        </div>

        <div
          class="flex justify-center my-5 text-sm text-muted-foreground"
          v-if="
            permissions.canEditCompetition &&
            !state.isCurrentNominationOpen &&
            !state.blocks.length &&
            state.nominationCompetitors.length > 0 &&
            state.nominationCompetitors.length < 3
          "
        >
          At least 3 fighters are required.
        </div>

        <TournamentCompetitionBlock
          v-for="block in state.blocks"
          :key="block.id"
          :state="blockState(block)"
          :permissions="blockPermissions"
          :options="blockOptions"
          :cards="blockCards"
          :actions="blockActions(block)"
        />

        <TieResolver
          v-if="permissions.canEditCompetition"
          :pendingTie="state.pendingTie"
          :blocks="state.blocks"
          @resolve-tie="actions.resolveTie"
        />

        <div
          v-if="permissions.canEditCompetition && state.activeOlympicFinalResultsFixed"
          class="flex justify-center my-5"
        >
          <Button @click="actions.finishCompetition">
            {{ $t('tournamentPageFixTournamentResults') }}
          </Button>
        </div>

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            permissions.canEditCompetition &&
            state.activeBlock?.type === 'GROUP' &&
            state.activeBlock.lifecycleState === 'RESULTS_FIXED' &&
            !competitionOptions.hasBlockingGroupAdvancementTie &&
            !state.nominationFinished
          "
        >
          <Button
            v-if="state.activeBlock.groups.length === 1"
            @click="actions.finishCompetition"
          >
            {{ $t('tournamentPageFixTournamentResults') }}
          </Button>
          <template v-else>
            <Button @click="actions.createGroupBlock">
              {{ $t('tournamentPageNextSubgroups') }}
            </Button>
            <Button
              v-if="competitionOptions.canOfferOlympic"
              @click="actions.createOlympicBlock()"
            >
              {{ $t('tournamentPageOlympicBracket') }}
            </Button>
            <Button
              v-if="competitionOptions.canOfferOlympicWithThirdPlaces"
              @click="actions.createOlympicBlock(true)"
            >
              {{ $t('tournamentPageOlympicBracketWithThirdPlaces') }}
            </Button>
          </template>
        </div>
      </template>
    </TabsContent>
  </Tabs>
</template>
