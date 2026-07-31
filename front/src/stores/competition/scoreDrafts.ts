import type { CompetitionBlock, FightData } from '@/model/competition'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'
import type { FightWarning, RoundScore } from '@shared/fightScoring'
import { applyFightScoreDraft } from './fightScoring'
import { readFightResultDrafts, writeFightResultDrafts } from './resultDrafts'

export interface UpdateCompetitionFightScoreDraftParams {
  blocks: CompetitionBlock[]
  tournamentId: number
  nominationId: number
  fightId: number
  fightNumber: number
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
}

export const updateCompetitionFightScoreDraft = ({
  blocks,
  tournamentId,
  nominationId,
  fightId,
  fightNumber,
  roundScores,
  warnings
}: UpdateCompetitionFightScoreDraftParams) => {
  let targetBlock: CompetitionBlock | undefined

  for (const block of blocks) {
    const fight = block.fights.find((candidate) =>
      fightId > 0 ? candidate.id === fightId : candidate.number === fightNumber
    )
    if (fight) {
      const drafts = readFightResultDrafts(tournamentId, nominationId)
      const previousDraft = drafts[String(fight.id)]
      const nextWarnings = warnings ?? previousDraft?.warnings ?? fight.warnings ?? []
      const nextRoundScores = roundScores ?? fight.roundScores

      applyFightScoreDraft(fight, {
        roundScores: nextRoundScores,
        warnings: nextWarnings
      })
      fight.isFinished = false
      targetBlock = block

      drafts[String(fight.id)] = {
        blockId: block.id,
        roundScores: nextRoundScores,
        warnings: nextWarnings
      }
      writeFightResultDrafts(tournamentId, nominationId, drafts)
      break
    }
  }

  if (targetBlock?.type === 'GROUP') {
    updateGroupsStatistics(targetBlock.groups, targetBlock.fightsBlocks)
  }
}

export const clearFightResultDrafts = (
  tournamentId: number,
  nominationId: number,
  fights: FightData[]
) => {
  const drafts = readFightResultDrafts(tournamentId, nominationId)
  fights.forEach((fight) => delete drafts[String(fight.id)])
  writeFightResultDrafts(tournamentId, nominationId, drafts)
}
