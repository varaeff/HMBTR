import type { FightWarning, RoundScore } from '@shared/fightScoring'

export interface FightResultDraft {
  blockId: number
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
}

export type FightResultDrafts = Record<string, FightResultDraft>

const getFightResultDraftsKey = (tournamentId: number, nominationId: number) =>
  `HMBTR-competition-result-drafts-${tournamentId}-${nominationId}`

export const readFightResultDrafts = (
  tournamentId: number,
  nominationId: number
): FightResultDrafts => {
  const rawDrafts = localStorage.getItem(getFightResultDraftsKey(tournamentId, nominationId))
  if (!rawDrafts) return {}

  try {
    return JSON.parse(rawDrafts) as FightResultDrafts
  } catch {
    return {}
  }
}

export const writeFightResultDrafts = (
  tournamentId: number,
  nominationId: number,
  drafts: FightResultDrafts
) => {
  const key = getFightResultDraftsKey(tournamentId, nominationId)

  if (!Object.keys(drafts).length) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(key, JSON.stringify(drafts))
}
