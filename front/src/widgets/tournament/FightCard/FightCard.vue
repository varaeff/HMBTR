<script setup lang="ts">
import { computed, ref } from 'vue'
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
import type { ActiveWithdrawalSummary, FightData, Fighter, TournamentMarshal } from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'
import type {
  ActiveCardTypes,
  CancelWithdrawalAction,
  CreateDisciplinaryCardAction,
  CreateFightWithdrawalAction
} from '@/widgets/tournament/types'
import FightWithdrawalDialog from './FightWithdrawalDialog.vue'
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
  createWithdrawal?: CreateFightWithdrawalAction
  cancelWithdrawal?: CancelWithdrawalAction
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
  (e: 'withdrawal-changed'): void
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
const fighter1CompetitorId = computed(() => props.fight.competitor1Id ?? props.fight.fighter1.id)
const fighter2CompetitorId = computed(() => props.fight.competitor2Id ?? props.fight.fighter2.id)
const canIssueCardAction = computed(
  () => Boolean(props.canIssueCards && props.createDisciplinaryCard) && !props.fight.isFinished
)
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

const withdrawalDialogOpen = ref(false)
const withdrawalFighter = ref<Fighter | null>(null)
const withdrawalCompetitorId = ref<number | null>(null)
const withdrawalReason = ref('')
const withdrawalIsExcused = ref(false)
const isSavingWithdrawal = ref(false)

const canWithdrawSide = (withdrawal?: ActiveWithdrawalSummary | null) =>
  Boolean(props.createWithdrawal && props.hasAccess && !props.fight.isFinished && !withdrawal)

const canOpenParticipantMenu = (withdrawal?: ActiveWithdrawalSummary | null) =>
  canOpenFighterMenu.value ||
  canWithdrawSide(withdrawal) ||
  Boolean(props.cancelWithdrawal && withdrawal)

const openWithdrawalDialog = (fighter: Fighter, competitorId: number) => {
  if (!props.createWithdrawal || !props.hasAccess || props.fight.isFinished) return

  withdrawalFighter.value = fighter
  withdrawalCompetitorId.value = competitorId
  withdrawalReason.value = ''
  withdrawalIsExcused.value = false
  withdrawalDialogOpen.value = true
}

const saveWithdrawal = async () => {
  if (!props.createWithdrawal || withdrawalCompetitorId.value === null) return
  const reason = withdrawalReason.value.trim()
  if (!reason) return

  isSavingWithdrawal.value = true
  try {
    await props.createWithdrawal({
      fightId: props.fight.id,
      competitorId: withdrawalCompetitorId.value,
      reason,
      isExcused: withdrawalIsExcused.value
    })
    withdrawalDialogOpen.value = false
    emit('withdrawal-changed')
  } finally {
    isSavingWithdrawal.value = false
  }
}

const cancelExistingWithdrawal = async (withdrawal: ActiveWithdrawalSummary) => {
  if (!props.cancelWithdrawal) return

  await props.cancelWithdrawal(withdrawal.id)
  emit('withdrawal-changed')
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
        :withdrawal="fight.fighter1Withdrawal"
        :warning-markers="warningMarkers(1)"
        :warning-title="warningTitle"
        :can-open-menu="canOpenParticipantMenu(fight.fighter1Withdrawal)"
        :can-issue-card="canIssueCardAction"
        :can-issue-warning="canIssueWarning(1)"
        :can-remove-warnings="canRemoveWarnings"
        :can-withdraw="canWithdrawSide(fight.fighter1Withdrawal)"
        :can-cancel-withdrawal="Boolean(cancelWithdrawal && fight.fighter1Withdrawal)"
        @issue-card="openIssueDialog"
        @issue-warning="issueWarning(1)"
        @remove-warning="removeWarningAtIndex"
        @withdraw-fighter="openWithdrawalDialog($event, fighter1CompetitorId)"
        @cancel-withdrawal="cancelExistingWithdrawal"
      />
      <span class="px-2">-</span>
      <FightParticipantLabel
        :surname="fighter2Surname"
        :fighter="fight.fighter2"
        :card-types="fighter2CardTypes"
        :withdrawal="fight.fighter2Withdrawal"
        :warning-markers="warningMarkers(2)"
        :warning-title="warningTitle"
        :can-open-menu="canOpenParticipantMenu(fight.fighter2Withdrawal)"
        :can-issue-card="canIssueCardAction"
        :can-issue-warning="canIssueWarning(2)"
        :can-remove-warnings="canRemoveWarnings"
        :can-withdraw="canWithdrawSide(fight.fighter2Withdrawal)"
        :can-cancel-withdrawal="Boolean(cancelWithdrawal && fight.fighter2Withdrawal)"
        @issue-card="openIssueDialog"
        @issue-warning="issueWarning(2)"
        @remove-warning="removeWarningAtIndex"
        @withdraw-fighter="openWithdrawalDialog($event, fighter2CompetitorId)"
        @cancel-withdrawal="cancelExistingWithdrawal"
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

  <FightWithdrawalDialog
    v-model:open="withdrawalDialogOpen"
    v-model:reason="withdrawalReason"
    v-model:isExcused="withdrawalIsExcused"
    :fighter="withdrawalFighter"
    :is-saving="isSavingWithdrawal"
    @save="saveWithdrawal"
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
