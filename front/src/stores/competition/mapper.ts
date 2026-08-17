import type {
  BlockData,
  BracketSlot,
  CompetitionBlock,
  CompetitionPlacement,
  FightData,
  Group,
  GroupFighter,
  PendingTie
} from '@/model/competition'
import type { Fighter } from '@/model/fighter'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'
import { getInitialRoundScores, type FightScoringRules } from '@shared/fightScoring'
import { applyFightScoreDraft, evaluateFightWithWarnings } from './fightScoring'
import type { FightResultDrafts } from './resultDrafts'

type ResolveFighterById = (fighterId: number) => Fighter | undefined

interface CompetitionMapperOptions {
  resolveFighterById?: ResolveFighterById
}

interface RawFighter {
  id?: number
  name?: string
  surname?: string
  patronymic?: string | null
  birthday?: string | Date | null
  city_id?: number | null
  club_id?: number | null
  pic?: string
}

interface RawCompetitor {
  id: number
  fighter_id: number
  fighter?: RawFighter | null
}

interface RawFight {
  id: number
  fight_number: number
  group_id?: number
  competitor1: RawCompetitor
  competitor2: RawCompetitor
  competitor1_id?: number
  competitor2_id?: number
  competitor1_score: number
  competitor2_score: number
  winner_id?: number | null
  forfeit_card_id?: number | null
  bracket_round?: number
  bracket_position?: number
  is_bronze?: boolean
  is_finished?: boolean
  rounds?: 1 | 2 | 3
  round_win?: boolean
  main_round_time?: number
  additional_round_time?: number
  warnings?: Array<{
    competitor_id: number
    round: number
    reason: string
  }>
  round_scores?: Array<{
    competitor1_score: number
    competitor2_score: number
    duration_seconds?: number
  }>
}

interface RawGroupPlacement {
  place: number
  competitor_id: number
}

interface RawGroupCompetitor {
  competitor: RawCompetitor
}

interface RawGroup {
  id?: number
  name: string
  fighters?: RawGroupCompetitor[]
  placements?: RawGroupPlacement[]
}

interface RawBracketSlot {
  id: number
  competitor_id: number
  seed_position: number
  slot_position: number
  competitor: RawCompetitor
}

interface RawCompetitionBlock {
  id: number
  type: CompetitionBlock['type']
  stage: number
  status: CompetitionBlock['status']
  lifecycle_state: CompetitionBlock['lifecycleState']
  groups?: RawGroup[]
  fights?: RawFight[]
  bracket_slots?: RawBracketSlot[]
  round_states?: Array<{
    round: number
    pairs_fixed: boolean
    results_fixed: boolean
  }>
}

interface RawCompetitionPlacement {
  place: number
  competitor_id: number
  competitor: RawCompetitor
}

export interface RawCompetitionState {
  tournamentNomination?: {
    is_open: boolean
    nomination?: {
      rounds: number
      round_win: boolean
    }
  }
  blocks?: RawCompetitionBlock[]
  placements?: RawCompetitionPlacement[]
  activeBlockId?: number | null
  pendingTie?: PendingTie | null
  isFinished?: boolean
}

const createFallbackFighter = (rawFighter?: RawFighter | null): Fighter => ({
  id: rawFighter?.id ?? 0,
  name: rawFighter?.name ?? '',
  surname: rawFighter?.surname ?? '',
  patronymic: rawFighter?.patronymic ?? undefined,
  birthday: rawFighter?.birthday ? new Date(rawFighter.birthday) : null,
  country: '',
  city: rawFighter?.city_id ? String(rawFighter.city_id) : '',
  club: rawFighter?.club_id ? String(rawFighter.club_id) : undefined,
  pic: rawFighter?.pic
})

const groupFighterFromCompetitor = (
  competitor: RawCompetitor,
  options: CompetitionMapperOptions
): GroupFighter => {
  const fighter =
    options.resolveFighterById?.(competitor.fighter_id) ?? createFallbackFighter(competitor.fighter)

  return {
    ...fighter,
    competitorId: competitor.id,
    wins: 0,
    diff: 0
  }
}

const mapFight = (
  fight: RawFight,
  rules: FightScoringRules,
  options: CompetitionMapperOptions
): FightData => {
  const fightRules: FightScoringRules = {
    rounds: fight.rounds ?? rules.rounds,
    roundWin: fight.round_win ?? rules.roundWin
  }
  const mainRoundTime = fight.main_round_time ?? 0
  const additionalRoundTime = fight.additional_round_time ?? 0
  const roundDurationSeconds = (roundNumber: number) =>
    roundNumber <= fightRules.rounds ? mainRoundTime : additionalRoundTime
  const warnings =
    fight.warnings?.map((warning) => ({
      competitorId: warning.competitor_id,
      round: warning.round,
      reason: warning.reason
    })) ?? []
  const relationRounds =
    fight.round_scores?.map((score, index) => ({
      competitor1Score: score.competitor1_score,
      competitor2Score: score.competitor2_score,
      durationSeconds: score.duration_seconds ?? roundDurationSeconds(index + 1)
    })) ?? []
  const storedRounds = relationRounds
  const editableRounds = storedRounds.length
    ? storedRounds
    : getInitialRoundScores(fightRules)
  const scored = evaluateFightWithWarnings(fightRules, {
    competitor1Id: fight.competitor1_id,
    competitor2Id: fight.competitor2_id,
    fighter1Score: fight.competitor1_score,
    fighter2Score: fight.competitor2_score,
    roundScores: editableRounds,
    warnings,
    forfeitCardId: fight.forfeit_card_id
  })

  return {
    id: fight.id,
    number: fight.fight_number,
    groupId: fight.group_id,
    fighter1: groupFighterFromCompetitor(fight.competitor1, options),
    fighter2: groupFighterFromCompetitor(fight.competitor2, options),
    competitor1Id: fight.competitor1_id,
    competitor2Id: fight.competitor2_id,
    fighter1Score: fight.competitor1_score,
    fighter2Score: fight.competitor2_score,
    fighter1EffectiveScore: scored.fighter1EffectiveScore,
    fighter2EffectiveScore: scored.fighter2EffectiveScore,
    roundScores: editableRounds,
    warnings,
    rounds: fightRules.rounds,
    roundWin: fightRules.roundWin,
    mainRoundTime,
    additionalRoundTime,
    isResultValid: Boolean(fight.forfeit_card_id) || scored.evaluation.isValidResult,
    winnerId: fight.winner_id,
    forfeitCardId: fight.forfeit_card_id,
    bracketRound: fight.bracket_round,
    bracketPosition: fight.bracket_position,
    isBronze: fight.is_bronze,
    isFinished: fight.is_finished
  }
}

const buildGroupFightBlocks = (groups: Group[], fights: FightData[]): BlockData[] => {
  const blocks: BlockData[] = []

  for (let i = 0; i < groups.length; i += 2) {
    const group1 = groups[i]
    const group2 = groups[i + 1]
    const letters = group2 ? [group1.letter, group2.letter] : [group1.letter]
    const groupIds = new Set(
      [group1.id, group2?.id].filter((groupId): groupId is number => groupId !== undefined)
    )
    const pairedGroups = group2 ? [group1, group2] : [group1]
    const groupFighterIds = new Set(
      pairedGroups.flatMap((group) => group.fighters.map((fighter) => fighter.id))
    )

    blocks.push({
      letters,
      fights: fights.filter((fight) => {
        if (fight.groupId && groupIds.has(fight.groupId)) return true
        return groupFighterIds.has(fight.fighter1.id) && groupFighterIds.has(fight.fighter2.id)
      })
    })
  }

  return blocks
}

export const mapCompetitionState = (
  payload: RawCompetitionState,
  drafts: FightResultDrafts = {},
  options: CompetitionMapperOptions = {}
) => {
  const scoringRules: FightScoringRules = {
    rounds: (payload.tournamentNomination?.nomination?.rounds ?? 1) as FightScoringRules['rounds'],
    roundWin: payload.tournamentNomination?.nomination?.round_win ?? false
  }
  const blocks: CompetitionBlock[] = (payload.blocks ?? []).map((block) => {
    const groups: Group[] = (block.groups ?? []).map((group) => ({
      id: group.id,
      letter: group.name,
      fighters: (group.fighters ?? []).map((gf) =>
        groupFighterFromCompetitor(gf.competitor, options)
      ),
      placements: (group.placements ?? []).map((placement) => ({
        place: placement.place,
        competitorId: placement.competitor_id
      }))
    }))
    const fights = (block.fights ?? []).map((rawFight) => {
      const fight = mapFight(rawFight, scoringRules, options)
      const draft = drafts[String(fight.id)]

      if (draft && !fight.isFinished) {
        applyFightScoreDraft(fight, draft)
      }

      return fight
    })
    const bracketSlots: BracketSlot[] = (block.bracket_slots ?? []).map((slot) => ({
      id: slot.id,
      competitorId: slot.competitor_id,
      seedPosition: slot.seed_position,
      slotPosition: slot.slot_position,
      fighter: groupFighterFromCompetitor(slot.competitor, options)
    }))

    if (block.type === 'GROUP') {
      updateGroupsStatistics(groups, [{ letters: [], fights }])
    }

    return {
      id: block.id,
      type: block.type,
      stage: block.stage,
      status: block.status,
      lifecycleState: block.lifecycle_state,
      groups,
      fights,
      fightsBlocks: buildGroupFightBlocks(groups, fights),
      bracketSlots,
      roundStates: (block.round_states ?? []).map((state) => ({
        round: state.round,
        pairsFixed: state.pairs_fixed,
        resultsFixed: state.results_fixed
      }))
    }
  })

  const placements: CompetitionPlacement[] = (payload.placements ?? []).map((placement) => ({
    place: placement.place,
    competitorId: placement.competitor_id,
    fighter: groupFighterFromCompetitor(placement.competitor, options)
  }))

  return {
    blocks,
    placements,
    activeBlockId: payload.activeBlockId ?? null,
    pendingTie: payload.pendingTie ?? null,
    isFinished: Boolean(payload.isFinished),
    isRegistrationOpen: payload.tournamentNomination?.is_open ?? null,
    scoringRules
  }
}
