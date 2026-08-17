<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { tData } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { FightData, Fighter, TournamentMarshal } from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'
import type { ActiveCardTypes, CreateDisciplinaryCardAction } from '@/widgets/tournament/types'
import FightParticipantLabel from './FightParticipantLabel.vue'
import FightResultDisplay from './FightResultDisplay.vue'
import FightScoreEditor from './FightScoreEditor.vue'
import FightWarningIssueDialog from './FightWarningIssueDialog.vue'
import IssueCardDialog from './IssueCardDialog.vue'
import { hasEditableRoundTimeInput } from '../fightRoundTimeVisibility'
import { useFightScoreDraft } from './useFightScoreDraft'
import { useIssueCardDialog } from './useIssueCardDialog'

const props = defineProps<{
  fight: FightData
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: ActiveCardTypes
  tournamentMarshals?: TournamentMarshal[]
  createDisciplinaryCard?: CreateDisciplinaryCardAction
  showRoundTimes?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'update:score',
    payload: {
      roundScores?: RoundScore[]
      warnings?: FightWarning[]
    }
  ): void
  (e: 'card-issued'): void
}>()

const { i18next } = useTranslation()
const fightRef = computed(() => props.fight)
const hasAccessRef = computed(() => props.hasAccess)
const canIssueCardsRef = computed(() => props.canIssueCards)

const currentLanguage = computed(() => i18next.language)
const fighter1Surname = computed(() => tData(props.fight.fighter1.surname, currentLanguage.value))
const fighter2Surname = computed(() => tData(props.fight.fighter2.surname, currentLanguage.value))
const fighter1CardTypes = computed(() => props.activeCardTypes?.[props.fight.fighter1.id] ?? [])
const fighter2CardTypes = computed(() => props.activeCardTypes?.[props.fight.fighter2.id] ?? [])
const cardDate = computed(() => props.cardDate ?? new Date().toISOString().slice(0, 10))
const {
  canEdit,
  canEditScores,
  canOpenFighterMenu,
  canRemoveWarnings,
  resultDisplay,
  warningResultScore,
  visibleRoundScores,
  highlightTieBreakRequired,
  warningIssueDialogOpen,
  warningIssueRound,
  warningIssueReason,
  extraRoundWarningRemovalDialogOpen,
  extraRoundWarningRemovalDescription,
  warningTitle,
  availableWarningIssueRounds,
  warningMarkers,
  bonusForScore,
  updateScore,
  updateRoundTime,
  handleBlur,
  canIssueWarning,
  issueWarning,
  confirmWarningIssue,
  removeWarningAtIndex,
  confirmExtraRoundWarningRemoval,
  cancelExtraRoundWarningRemoval
} = useFightScoreDraft({
  fight: fightRef,
  hasAccess: hasAccessRef,
  canIssueCards: canIssueCardsRef,
  translate: i18next.t.bind(i18next),
  emitScoreUpdate: (payload) => emit('update:score', payload)
})
const shouldShowRoundTimes = computed(() =>
  Boolean(
    props.showRoundTimes ||
      props.fight.isFinished ||
      (props.hasAccess && !hasEditableRoundTimeInput(props.fight))
  )
)
const {
  issueDialogOpen,
  issueFighter,
  issueType,
  issueDate,
  issueReason,
  issueMarshalId,
  isIssuing,
  openIssueDialog: openIssueCardDialog,
  issueCard
} = useIssueCardDialog({
  createCard: async (payload) => {
    if (!props.createDisciplinaryCard) {
      throw new Error('Disciplinary card creation action is not provided')
    }

    return props.createDisciplinaryCard(payload)
  },
  getFight: () => props.fight,
  getTournamentId: () => props.tournamentId,
  cardDate,
  emitCardIssued: () => emit('card-issued')
})

const openIssueDialog = (fighter: Fighter) => {
  if (!props.canIssueCards || !props.createDisciplinaryCard) return

  openIssueCardDialog(fighter)
}
</script>

<template>
  <div class="flex items-center gap-4 py-1 px-3 border rounded-lg bg-card" :data-fight-card-id="fight.id">
    <div class="w-auto shrink-0 text-sm text-slate-400 font-semibold">{{ fight.number }}.</div>

    <div class="flex-1 text-sm font-medium">
      <FightParticipantLabel
        :surname="fighter1Surname"
        :fighter="fight.fighter1"
        :card-types="fighter1CardTypes"
        :warning-markers="warningMarkers(1)"
        :warning-title="warningTitle"
        :can-open-menu="canOpenFighterMenu"
        :can-issue-warning="canIssueWarning(1)"
        :can-remove-warnings="canRemoveWarnings"
        @issue-card="openIssueDialog"
        @issue-warning="issueWarning(1)"
        @remove-warning="removeWarningAtIndex"
      />
      <span class="px-2">-</span>
      <FightParticipantLabel
        :surname="fighter2Surname"
        :fighter="fight.fighter2"
        :card-types="fighter2CardTypes"
        :warning-markers="warningMarkers(2)"
        :warning-title="warningTitle"
        :can-open-menu="canOpenFighterMenu"
        :can-issue-warning="canIssueWarning(2)"
        :can-remove-warnings="canRemoveWarnings"
        @issue-card="openIssueDialog"
        @issue-warning="issueWarning(2)"
        @remove-warning="removeWarningAtIndex"
      />
    </div>

    <div class="flex items-center gap-2">
      <FightScoreEditor
        v-if="canEdit"
        :visible-round-scores="visibleRoundScores"
        :can-edit-scores="canEditScores"
        :show-round-times="shouldShowRoundTimes"
        :highlight-tie-break-required="highlightTieBreakRequired"
        :bonus-for-score="bonusForScore"
        @update-score="updateScore"
        @update-round-time="updateRoundTime"
        @score-blur="handleBlur"
      />
      <FightResultDisplay
        v-else
        :warning-result-score="warningResultScore"
        :result-display="resultDisplay"
        :round-scores="visibleRoundScores"
        :show-round-times="shouldShowRoundTimes"
      />
    </div>
  </div>

  <FightWarningIssueDialog
    v-model:open="warningIssueDialogOpen"
    v-model:selected-round="warningIssueRound"
    v-model:reason="warningIssueReason"
    :issue-rounds="availableWarningIssueRounds"
    @confirm="confirmWarningIssue"
  />

  <IssueCardDialog
    v-model:open="issueDialogOpen"
    v-model:type="issueType"
    v-model:reason="issueReason"
    v-model:marshalId="issueMarshalId"
    :fighter="issueFighter"
    :date="issueDate"
    :tournament-marshals="tournamentMarshals ?? []"
    :is-issuing="isIssuing"
    @issue="issueCard"
  />

  <Dialog v-model:open="extraRoundWarningRemovalDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('fightExtraRoundWarningRemovalTitle') }}</DialogTitle>
        <DialogDescription>
          {{ extraRoundWarningRemovalDescription }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          data-testid="extra-round-warning-removal-cancel"
          @click="cancelExtraRoundWarningRemoval"
        >
          {{ $t('disciplinaryCardsCancel') }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="extra-round-warning-removal-confirm"
          @click="confirmExtraRoundWarningRemoval"
        >
          {{ $t('fightExtraRoundWarningRemovalConfirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
