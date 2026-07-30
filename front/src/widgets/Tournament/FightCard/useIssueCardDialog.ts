import { ref, type ComputedRef } from 'vue'
import type {
  CreateDisciplinaryCardPayload,
  DisciplinaryCard,
  DisciplinaryCardType,
  FightData,
  Fighter
} from '@/model'

interface IssueCardStore {
  createCard: (payload: CreateDisciplinaryCardPayload) => Promise<DisciplinaryCard>
}

interface UseIssueCardDialogParams {
  cardsStore: IssueCardStore
  getFight: () => FightData
  getTournamentId: () => number | undefined
  cardDate: ComputedRef<string>
  emitCardIssued: () => void
}

export const useIssueCardDialog = ({
  cardsStore,
  getFight,
  getTournamentId,
  cardDate,
  emitCardIssued
}: UseIssueCardDialogParams) => {
  const issueDialogOpen = ref(false)
  const issueFighter = ref<Fighter | null>(null)
  const issueType = ref<DisciplinaryCardType>('YELLOW')
  const issueDate = ref(new Date().toISOString().slice(0, 10))
  const issueReason = ref('')
  const issueMarshalId = ref<number | null>(null)
  const isIssuing = ref(false)

  const openIssueDialog = (fighter: Fighter) => {
    issueFighter.value = fighter
    issueType.value = 'YELLOW'
    issueDate.value = cardDate.value
    issueReason.value = ''
    issueMarshalId.value = null
    issueDialogOpen.value = true
  }

  const issueCard = async () => {
    const tournamentId = getTournamentId()
    if (!issueFighter.value || !tournamentId || !issueReason.value.trim() || !issueMarshalId.value)
      return

    try {
      isIssuing.value = true
      await cardsStore.createCard({
        fighter_id: issueFighter.value.id,
        tournament_id: tournamentId,
        fight_id: getFight().id,
        marshal_id: issueMarshalId.value,
        type: issueType.value,
        received_at: issueDate.value,
        reason: issueReason.value.trim()
      })
      issueDialogOpen.value = false
      emitCardIssued()
    } catch (error) {
      console.error('Failed to issue disciplinary card:', error)
    } finally {
      isIssuing.value = false
    }
  }

  return {
    issueDialogOpen,
    issueFighter,
    issueType,
    issueDate,
    issueReason,
    issueMarshalId,
    isIssuing,
    openIssueDialog,
    issueCard
  }
}
