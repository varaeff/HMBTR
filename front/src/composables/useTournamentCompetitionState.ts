import { computed, type ComputedRef, type Ref } from 'vue'
import { areFightResultsReady } from '@/lib/fightResult'
import type {
  CompetitionBlock,
  CompetitionPlacement,
  Fighter,
  PendingTie,
  Tournament,
  TournamentNomination
} from '@/model'

interface CompetitionReadStore {
  getNominationFighters: Fighter[]
  getBlocks: CompetitionBlock[]
  getActiveBlock: CompetitionBlock | null
  getPlacements: CompetitionPlacement[]
  getPendingTie: PendingTie | null
  getIsFinished: boolean
}

const OLYMPIC_BRACKET_SIZES: readonly number[] = [4, 8, 16]

export const useTournamentCompetitionState = ({
  tournament,
  currentTournamentNomination,
  competitionStore
}: {
  tournament: Ref<Tournament | null>
  currentTournamentNomination: ComputedRef<TournamentNomination | undefined>
  competitionStore: CompetitionReadStore
}) => {
  const nominationCompetitors = computed(() => competitionStore.getNominationFighters)
  const blocks = computed(() => competitionStore.getBlocks)
  const activeBlock = computed(() => competitionStore.getActiveBlock)
  const placements = computed(() => competitionStore.getPlacements)
  const pendingTie = computed(() => competitionStore.getPendingTie)
  const hasBlockingGroupAdvancementTie = computed(
    () => Boolean(pendingTie.value) && pendingTie.value?.scope !== 'OLYMPIC_THIRD'
  )
  const olympicCompetitorIds = computed(
    () =>
      new Set(
        blocks.value
          .filter((block) => block.type === 'OLYMPIC')
          .flatMap((block) => block.bracketSlots.map((slot) => slot.competitorId))
      )
  )
  const nominationFinished = computed(
    () => competitionStore.getIsFinished || Boolean(currentTournamentNomination.value?.is_finished)
  )
  const allTournamentNominationsFinished = computed(
    () =>
      Boolean(tournament.value?.nominations.length) &&
      tournament.value!.nominations.every((nomination) => nomination.is_finished)
  )

  const activeGroupBlockComplete = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return false
    return areFightResultsReady(activeBlock.value.fights)
  })

  const activeGroupFightsGenerated = computed(() => {
    return Boolean(activeBlock.value?.type === 'GROUP' && activeBlock.value.fights.length > 0)
  })

  const activeOlympicFinalResultsFixed = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'OLYMPIC') return false
    const finalRound = Math.log2(activeBlock.value.bracketSlots.length)
    return Boolean(
      activeBlock.value.roundStates.find((state) => state.round === finalRound)?.resultsFixed
    )
  })

  const canGenerateGroupFights = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP' || activeGroupFightsGenerated.value)
      return false
    return (
      activeBlock.value.groups.length > 0 &&
      activeBlock.value.groups.every((group) => group.fighters.length > 2)
    )
  })

  const activeAdvancerCount = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return 0
    if (!activeGroupBlockComplete.value || hasBlockingGroupAdvancementTie.value) return 0
    return activeBlock.value.groups.length === 1
      ? activeBlock.value.groups[0].fighters.length
      : activeBlock.value.groups.length * 2
  })

  const canOfferOlympic = computed(() =>
    OLYMPIC_BRACKET_SIZES.includes(activeAdvancerCount.value || nominationCompetitors.value.length)
  )

  const nextOlympicBracketSize = computed(() => {
    const competitorCount = activeAdvancerCount.value
    if (!competitorCount) return null

    return OLYMPIC_BRACKET_SIZES.find((size) => size >= competitorCount) ?? null
  })

  const olympicBracketShortfall = computed(() => {
    const targetSize = nextOlympicBracketSize.value
    if (!targetSize || targetSize === activeAdvancerCount.value) return 0

    return targetSize - activeAdvancerCount.value
  })

  const activeThirdPlaceCount = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return 0
    if (!activeGroupBlockComplete.value || hasBlockingGroupAdvancementTie.value) return 0
    if (activeBlock.value.groups.length < 2) return 0

    return activeBlock.value.groups.filter((group) => group.fighters.length >= 3).length
  })

  const canOfferOlympicWithThirdPlaces = computed(
    () =>
      !canOfferOlympic.value &&
      pendingTie.value?.scope !== 'OLYMPIC_THIRD' &&
      olympicBracketShortfall.value > 0 &&
      activeThirdPlaceCount.value >= olympicBracketShortfall.value
  )

  return {
    nominationCompetitors,
    blocks,
    activeBlock,
    placements,
    pendingTie,
    hasBlockingGroupAdvancementTie,
    olympicCompetitorIds,
    nominationFinished,
    allTournamentNominationsFinished,
    activeOlympicFinalResultsFixed,
    canGenerateGroupFights,
    canOfferOlympic,
    canOfferOlympicWithThirdPlaces
  }
}
