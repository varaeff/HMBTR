import type { WarningScorePart } from '@shared/fightScoring'

export type FighterSide = 1 | 2

export interface FightWarningMarker {
  id: string
  warningIndex: number
  round?: number
  title: string
}

export interface FightResultDisplayText {
  score: string
  details: string
}

export interface FightWarningResultScore {
  leading: string
  parts: WarningScorePart[]
}
