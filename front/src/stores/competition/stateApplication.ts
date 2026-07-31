import type { Fighter } from '@/model'
import { mapCompetitionState, type RawCompetitionState } from './mapper'
import { readFightResultDrafts, writeFightResultDrafts } from './resultDrafts'

type ResolveFighterById = (fighterId: number) => Fighter | undefined

export interface CompetitionStateApplicationParams {
  payload: RawCompetitionState
  tournamentId: number
  nominationId: number
  resolveFighterById?: ResolveFighterById
}

export const mapAndPersistCompetitionState = ({
  payload,
  tournamentId,
  nominationId,
  resolveFighterById
}: CompetitionStateApplicationParams) => {
  const drafts = readFightResultDrafts(tournamentId, nominationId)
  const mapped = mapCompetitionState(payload, drafts, {
    resolveFighterById
  })
  const unfinishedFightIds = new Set(
    mapped.blocks.flatMap((block) =>
      block.fights.filter((fight) => !fight.isFinished).map((fight) => String(fight.id))
    )
  )
  const remainingDrafts = Object.fromEntries(
    Object.entries(drafts).filter(([fightId]) => unfinishedFightIds.has(fightId))
  )

  writeFightResultDrafts(tournamentId, nominationId, remainingDrafts)

  return mapped
}
