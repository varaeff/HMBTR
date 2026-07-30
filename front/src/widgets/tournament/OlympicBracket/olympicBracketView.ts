import type {
  BracketSlot,
  CompetitionBlock,
  CompetitionRoundState,
  FightData
} from '@/model'

export interface OlympicRoundView {
  round: number
  fights: FightData[]
}

export interface OlympicDeletionCounts {
  fights: number
  cards: number
}

export interface OlympicBracketView {
  rounds: OlympicRoundView[]
  mainRoundsCount: number
  latestRoundState: CompetitionRoundState | undefined
  pendingPairSlots: BracketSlot[]
  hasPendingPairs: boolean
  slotPairs: BracketSlot[][]
  bronzeFights: FightData[]
  finalRound: OlympicRoundView | null
  preliminaryRounds: OlympicRoundView[]
  finalBoundaryFights: FightData[]
}

export const getOlympicRounds = (block: CompetitionBlock): OlympicRoundView[] => {
  const roundMap = new Map<number, FightData[]>()

  block.fights
    .filter((fight) => !fight.isBronze)
    .forEach((fight) => {
      const round = fight.bracketRound ?? 1
      roundMap.set(round, [...(roundMap.get(round) ?? []), fight])
    })

  return [...roundMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, fights]) => ({
      round,
      fights: [...fights].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
    }))
}

export const getMainRoundsCount = (block: CompetitionBlock) => Math.log2(block.bracketSlots.length)

export const getMainFights = (block: CompetitionBlock) =>
  block.fights.filter((fight) => !fight.isBronze)

export const getLatestRoundState = (block: CompetitionBlock) =>
  [...block.roundStates].sort((a, b) => b.round - a.round)[0]

export const getRoundState = (block: CompetitionBlock, round: number) =>
  block.roundStates.find((state) => state.round === round)

export const isRoundResultsFixed = (block: CompetitionBlock, round: number) =>
  Boolean(getRoundState(block, round)?.resultsFixed)

export const hasLaterRound = (block: CompetitionBlock, round: number) =>
  block.roundStates.some((state) => state.round > round)

const getFightWinnerCompetitorId = (fight: FightData) => {
  if (!fight.isFinished || !fight.winnerId) return null
  return fight.winnerId
}

export const getPendingPairSlots = (block: CompetitionBlock): BracketSlot[] => {
  const sortedSlots = [...block.bracketSlots].sort((a, b) => a.slotPosition - b.slotPosition)
  const latestRoundState = getLatestRoundState(block)

  if (!latestRoundState || latestRoundState.pairsFixed) return []

  const mainFights = getMainFights(block)
  if (!mainFights.length) return sortedSlots

  const mainRoundsCount = getMainRoundsCount(block)
  if (!Number.isInteger(mainRoundsCount)) return []

  const semifinalRound = mainRoundsCount - 1
  const latestRound = Math.max(...mainFights.map((fight) => fight.bracketRound ?? 1))

  if (latestRound >= semifinalRound) return []

  const nextRound = latestRound + 1
  if (mainFights.some((fight) => (fight.bracketRound ?? 1) === nextRound)) return []

  const latestRoundFights = mainFights.filter(
    (fight) => (fight.bracketRound ?? 1) === latestRound
  )
  const winnerIds = latestRoundFights.map(getFightWinnerCompetitorId)

  if (winnerIds.some((winnerId) => winnerId === null)) return []

  const winnerSet = new Set(winnerIds.filter((winnerId): winnerId is number => winnerId !== null))

  return sortedSlots.filter((slot) => winnerSet.has(slot.competitorId))
}

export const pairOlympicSlots = (slots: BracketSlot[]) => {
  const pairs: BracketSlot[][] = []

  for (let i = 0; i < slots.length; i += 2) {
    pairs.push(slots.slice(i, i + 2))
  }

  return pairs
}

export const getBronzeFights = (block: CompetitionBlock) =>
  block.fights.filter((fight) => fight.isBronze)

export const getFinalRound = (rounds: OlympicRoundView[]) => {
  const sortedRounds = [...rounds].sort((a, b) => b.round - a.round)

  return sortedRounds.find((round) => round.fights.length === 1) ?? null
}

export const getPreliminaryRounds = (
  rounds: OlympicRoundView[],
  finalRound: OlympicRoundView | null
) => {
  if (!finalRound) return rounds

  return rounds.filter((round) => round.round !== finalRound.round)
}

export const canRecordFights = (fights: FightData[]) =>
  fights.length > 0 && fights.every((fight) => fight.isResultValid)

export const getOlympicDeletionCounts = (
  block: CompetitionBlock,
  round: number,
  attachedCardCountByFightId: Record<number, number>
): OlympicDeletionCounts => {
  const mainRoundsCount = getMainRoundsCount(block)
  const fights = block.fights.filter(
    (fight) => fight.bracketRound === round || (round === mainRoundsCount && fight.isBronze)
  )

  return {
    fights: fights.length,
    cards: fights.reduce(
      (total, fight) => total + (attachedCardCountByFightId[fight.id] ?? 0),
      0
    )
  }
}

export const getOlympicRoundLabelKey = (fights: FightData[]) => {
  switch (fights.length) {
    case 8:
      return 'tournamentPage1_8Final'
    case 4:
      return 'tournamentPage1_4Final'
    case 2:
      return 'tournamentPageSemifinals'
    case 1:
      return 'tournamentPageFinal'
    default:
      return 'tournamentPageRound'
  }
}

export const createOlympicBracketView = (block: CompetitionBlock): OlympicBracketView => {
  const rounds = getOlympicRounds(block)
  const mainRoundsCount = getMainRoundsCount(block)
  const latestRoundState = getLatestRoundState(block)
  const pendingPairSlots = getPendingPairSlots(block)
  const slotPairs = pairOlympicSlots(pendingPairSlots)
  const bronzeFights = getBronzeFights(block)
  const finalRound = getFinalRound(rounds)

  return {
    rounds,
    mainRoundsCount,
    latestRoundState,
    pendingPairSlots,
    hasPendingPairs: pendingPairSlots.length > 0,
    slotPairs,
    bronzeFights,
    finalRound,
    preliminaryRounds: getPreliminaryRounds(rounds, finalRound),
    finalBoundaryFights: [...(finalRound?.fights ?? []), ...bronzeFights]
  }
}
