import { computed, type ComputedRef, type Ref } from 'vue'
import type {
  CompetitionBlock,
  DisciplinaryCard,
  DisciplinaryCardStatus,
  Tournament
} from '@/model'

interface TournamentCardsStateStore {
  tournamentCards: DisciplinaryCard[]
}

const toDateInputValue = (date: Date) => {
  const parsed = new Date(date)
  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const useTournamentCardsState = ({
  tournament,
  activeTab,
  blocks,
  cardsStore
}: {
  tournament: Ref<Tournament | null>
  activeTab: Ref<number>
  blocks: ComputedRef<CompetitionBlock[]>
  cardsStore: TournamentCardsStateStore
}) => {
  const cardIssueDate = computed(() =>
    tournament.value?.event_date
      ? toDateInputValue(tournament.value.event_date)
      : toDateInputValue(new Date())
  )

  const tournamentCardCheckDate = computed(() => {
    if (tournament.value?.event_date) return tournament.value.event_date
    return new Date()
  })

  const isCardActive = (receivedAt: string, expiresAt: string) => {
    const checkDate = new Date(tournamentCardCheckDate.value).setHours(0, 0, 0, 0)
    const received = new Date(receivedAt).setHours(0, 0, 0, 0)
    const expires = new Date(expiresAt).setHours(0, 0, 0, 0)

    return received <= checkDate && expires >= checkDate
  }

  const activeCardTypes = computed<Partial<Record<number, DisciplinaryCardStatus>>>(() => {
    const statuses: Partial<Record<number, DisciplinaryCardStatus>> = {}
    const priority = (status: DisciplinaryCardStatus) =>
      status.type === 'RED' ? (status.active ? 3 : 2) : 1

    for (const card of cardsStore.tournamentCards) {
      if (!isCardActive(card.received_at, card.expires_at)) continue
      if (card.type === 'YELLOW' && !card.active) continue
      const nextStatus: DisciplinaryCardStatus = {
        type: card.type,
        active: card.active
      }
      const currentStatus = statuses[card.fighter_id]
      if (!currentStatus || priority(nextStatus) > priority(currentStatus)) {
        statuses[card.fighter_id] = nextStatus
      }
    }

    return statuses
  })

  const getRedCardGroupFighterKeys = (block: CompetitionBlock) => {
    const keys = new Set<string>()

    for (const card of cardsStore.tournamentCards) {
      if (
        card.type !== 'RED' ||
        !card.active ||
        card.nomination_id !== activeTab.value ||
        card.fight_stage !== block.stage ||
        !card.group_name ||
        !isCardActive(card.received_at, card.expires_at)
      ) {
        continue
      }
      keys.add(`${card.group_name}:${card.fighter_id}`)
    }

    return keys
  }

  const attachedCardCountByFightId = computed<Record<number, number>>(() => {
    const counts: Record<number, number> = {}
    for (const card of cardsStore.tournamentCards) {
      counts[card.fight_id] = (counts[card.fight_id] ?? 0) + 1
    }
    return counts
  })

  const getBlockDeletionCounts = (blockId: number) => {
    const fights = blocks.value.find((block) => block.id === blockId)?.fights ?? []
    return {
      fights: fights.length,
      cards: fights.reduce(
        (total, fight) => total + (attachedCardCountByFightId.value[fight.id] ?? 0),
        0
      )
    }
  }

  const getOlympicRoundDeletionCounts = (blockId: number, round: number) => {
    const block = blocks.value.find((item) => item.id === blockId)
    const mainRoundsCount = block ? Math.log2(block.bracketSlots.length) : 0
    const fights =
      block?.fights.filter(
        (fight) => fight.bracketRound === round || (round === mainRoundsCount && fight.isBronze)
      ) ?? []

    return {
      fights: fights.length,
      cards: fights.reduce(
        (total, fight) => total + (attachedCardCountByFightId.value[fight.id] ?? 0),
        0
      )
    }
  }

  return {
    cardIssueDate,
    activeCardTypes,
    attachedCardCountByFightId,
    getRedCardGroupFighterKeys,
    getBlockDeletionCounts,
    getOlympicRoundDeletionCounts
  }
}
