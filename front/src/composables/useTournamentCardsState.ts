import { computed, type ComputedRef, type Ref } from 'vue'
import type {
  ActiveDisciplinaryCardSummary,
  CompetitionBlock,
  DisciplinaryCard,
  Tournament
} from '@/model'

interface TournamentCardsStateStore {
  tournamentCards: DisciplinaryCard[]
  tournamentActiveCards: ActiveDisciplinaryCardSummary[]
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

  const activeCardTypes = computed<Partial<Record<number, ActiveDisciplinaryCardSummary[]>>>(() => {
    const statuses: Partial<Record<number, ActiveDisciplinaryCardSummary[]>> = {}

    for (const card of cardsStore.tournamentActiveCards) {
      statuses[card.fighter_id] = [...(statuses[card.fighter_id] ?? []), card]
    }

    return statuses
  })
  const activeCardIdSet = computed(
    () => new Set(cardsStore.tournamentActiveCards.map((card) => card.id))
  )

  const getRedCardGroupFighterKeys = (block: CompetitionBlock) => {
    const keys = new Set<string>()

    for (const card of cardsStore.tournamentCards) {
      if (
        card.type !== 'RED' ||
        !card.active ||
        card.nomination_id !== activeTab.value ||
        card.fight_stage !== block.stage ||
        !card.group_name ||
        !activeCardIdSet.value.has(card.id)
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
