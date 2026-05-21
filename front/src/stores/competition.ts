import { defineStore } from 'pinia'
import http from '@/api/http'
import type {
  BlockData,
  BracketSlot,
  CompetitionBlock,
  CompetitionPlacement,
  Competitor,
  FightData,
  Fighter,
  Group,
  GroupFighter,
  PendingTie
} from '@/model'
import { API_ROUTES } from '@shared/routes'
import { useFightersListStore } from '@/stores/fightersList'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'

interface CompetitionState {
  tournamentCompetitors: Competitor[]
  blocks: CompetitionBlock[]
  activeBlockId: number | null
  placements: CompetitionPlacement[]
  pendingTie: PendingTie | null
  isFinished: boolean
  tournamentId: number
  nominationId: number
}

interface UpdateGlobalScoreParams {
  fightId: number
  fightNumber: number
  f1Score: number
  f2Score: number
}

interface SaveFightResultParams {
  blockId: number
  fights: FightData[]
}

interface FightResultDraft {
  blockId: number
  competitor1Score: number
  competitor2Score: number
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
  bracket_round?: number
  bracket_position?: number
  is_bronze?: boolean
  is_finished?: boolean
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
  groups?: RawGroup[]
  fights?: RawFight[]
  bracket_slots?: RawBracketSlot[]
}

interface RawCompetitionPlacement {
  place: number
  competitor_id: number
  competitor: RawCompetitor
}

interface RawCompetitionState {
  blocks?: RawCompetitionBlock[]
  placements?: RawCompetitionPlacement[]
  activeBlockId?: number | null
  pendingTie?: PendingTie | null
  isFinished?: boolean
}

const getFightResultDraftsKey = (tournamentId: number, nominationId: number) =>
  `HMBTR-competition-result-drafts-${tournamentId}-${nominationId}`

const readFightResultDrafts = (
  tournamentId: number,
  nominationId: number
): Record<string, FightResultDraft> => {
  const rawDrafts = localStorage.getItem(getFightResultDraftsKey(tournamentId, nominationId))
  if (!rawDrafts) return {}

  try {
    return JSON.parse(rawDrafts)
  } catch {
    return {}
  }
}

const writeFightResultDrafts = (
  tournamentId: number,
  nominationId: number,
  drafts: Record<string, FightResultDraft>
) => {
  const key = getFightResultDraftsKey(tournamentId, nominationId)

  if (!Object.keys(drafts).length) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(key, JSON.stringify(drafts))
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

const groupFighterFromCompetitor = (competitor: RawCompetitor): GroupFighter => {
  const fightersStore = useFightersListStore()
  const fighter =
    fightersStore.getFighterById(competitor.fighter_id) ?? createFallbackFighter(competitor.fighter)

  return {
    ...fighter,
    competitorId: competitor.id,
    wins: 0,
    diff: 0
  }
}

const mapFight = (fight: RawFight): FightData => ({
  id: fight.id,
  number: fight.fight_number,
  groupId: fight.group_id,
  fighter1: groupFighterFromCompetitor(fight.competitor1),
  fighter2: groupFighterFromCompetitor(fight.competitor2),
  competitor1Id: fight.competitor1_id,
  competitor2Id: fight.competitor2_id,
  fighter1Score: fight.competitor1_score,
  fighter2Score: fight.competitor2_score,
  bracketRound: fight.bracket_round,
  bracketPosition: fight.bracket_position,
  isBronze: fight.is_bronze,
  isFinished: fight.is_finished
})

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

const mapCompetitionState = (
  payload: RawCompetitionState,
  drafts: Record<string, FightResultDraft> = {}
) => {
  const blocks: CompetitionBlock[] = (payload.blocks ?? []).map((block) => {
    const groups: Group[] = (block.groups ?? []).map((group) => ({
      id: group.id,
      letter: group.name,
      fighters: (group.fighters ?? []).map((gf) => groupFighterFromCompetitor(gf.competitor)),
      placements: (group.placements ?? []).map((placement) => ({
        place: placement.place,
        competitorId: placement.competitor_id
      }))
    }))
    const fights = (block.fights ?? []).map((rawFight) => {
      const fight = mapFight(rawFight)
      const draft = drafts[String(fight.id)]

      if (draft && !fight.isFinished) {
        fight.fighter1Score = draft.competitor1Score
        fight.fighter2Score = draft.competitor2Score
      }

      return fight
    })
    const bracketSlots: BracketSlot[] = (block.bracket_slots ?? []).map((slot) => ({
      id: slot.id,
      competitorId: slot.competitor_id,
      seedPosition: slot.seed_position,
      slotPosition: slot.slot_position,
      fighter: groupFighterFromCompetitor(slot.competitor)
    }))

    if (block.type === 'GROUP') {
      updateGroupsStatistics(groups, [{ letters: [], fights }])
    }

    return {
      id: block.id,
      type: block.type,
      stage: block.stage,
      status: block.status,
      groups,
      fights,
      fightsBlocks: buildGroupFightBlocks(groups, fights),
      bracketSlots
    }
  })

  const placements: CompetitionPlacement[] = (payload.placements ?? []).map((placement) => ({
    place: placement.place,
    competitorId: placement.competitor_id,
    fighter: groupFighterFromCompetitor(placement.competitor)
  }))

  return {
    blocks,
    placements,
    activeBlockId: payload.activeBlockId ?? null,
    pendingTie: payload.pendingTie ?? null,
    isFinished: Boolean(payload.isFinished)
  }
}

export const useCompetitionStore = defineStore({
  id: 'competition',

  state: (): CompetitionState => ({
    tournamentCompetitors: [],
    blocks: [],
    activeBlockId: null,
    placements: [],
    pendingTie: null,
    isFinished: false,
    tournamentId: 0,
    nominationId: 0
  }),

  actions: {
    setTournamentAndNomination(tournamentId: number, nominationId: number) {
      this.tournamentId = tournamentId
      this.nominationId = nominationId
    },

    resetCompetitionState() {
      this.blocks = []
      this.activeBlockId = null
      this.placements = []
      this.pendingTie = null
      this.isFinished = false
    },

    applyCompetitionState(payload: RawCompetitionState) {
      const drafts = readFightResultDrafts(this.tournamentId, this.nominationId)
      const mapped = mapCompetitionState(payload, drafts)
      const unfinishedFightIds = new Set(
        mapped.blocks.flatMap((block) =>
          block.fights.filter((fight) => !fight.isFinished).map((fight) => String(fight.id))
        )
      )
      const remainingDrafts = Object.fromEntries(
        Object.entries(drafts).filter(([fightId]) => unfinishedFightIds.has(fightId))
      )

      writeFightResultDrafts(this.tournamentId, this.nominationId, remainingDrafts)
      this.blocks = mapped.blocks
      this.activeBlockId = mapped.activeBlockId
      this.placements = mapped.placements
      this.pendingTie = mapped.pendingTie
      this.isFinished = mapped.isFinished
    },

    async loadCompetitionState() {
      const currentTournamentId = this.tournamentId
      const currentNomId = this.nominationId
      const { data } = await http.get(
        API_ROUTES.COMPETITION.STATE(this.tournamentId, this.nominationId)
      )

      if (this.tournamentId === currentTournamentId && this.nominationId === currentNomId) {
        this.applyCompetitionState(data)
      }
    },

    async setCompetitors() {
      const currentNomId = this.nominationId
      const url = API_ROUTES.COMPETITORS.BY_TOURNAMENT(this.tournamentId)
      const { data } = await http.get(url)

      if (this.nominationId === currentNomId) {
        this.tournamentCompetitors = data
      }
    },

    async registerFighter(fighterId: number, nominationId: number) {
      const url = API_ROUTES.COMPETITORS.ROOT
      const { data } = await http.post(url, {
        fighter_id: fighterId,
        tournament_id: this.tournamentId,
        nomination_id: nominationId
      })
      this.tournamentCompetitors.push(data)
    },

    async deleteCompetitor(competitorId: number) {
      const url = `${API_ROUTES.COMPETITORS.ROOT}/${competitorId}`
      await http.delete(url)
      const index = this.tournamentCompetitors.findIndex((c) => c.id === competitorId)
      if (index !== -1) {
        this.tournamentCompetitors.splice(index, 1)
      }
    },

    async createGroupBlock() {
      const { data } = await http.post(API_ROUTES.COMPETITION.GROUP_BLOCK, {
        tournament_id: this.tournamentId,
        nomination_id: this.nominationId
      })
      this.applyCompetitionState(data)
    },

    async generateGroupFights(blockId: number) {
      const activeBlock = this.blocks.find((block) => block.id === blockId)
      if (!activeBlock || activeBlock.type !== 'GROUP') return

      const { data } = await http.post(API_ROUTES.COMPETITION.GROUP_FIGHTS, {
        block_id: blockId,
        groups: activeBlock.groups.map((group) => ({
          letter: group.letter,
          competitor_ids: group.fighters.map((fighter) => fighter.competitorId).filter(Boolean)
        }))
      })
      this.applyCompetitionState(data)
    },

    async createOlympicBlock(includeThirdPlaces = false) {
      const { data } = await http.post(API_ROUTES.COMPETITION.OLYMPIC_BLOCK, {
        tournament_id: this.tournamentId,
        nomination_id: this.nominationId,
        include_third_places: includeThirdPlaces
      })
      this.applyCompetitionState(data)
    },

    updateGlobalScore({ fightId, fightNumber, f1Score, f2Score }: UpdateGlobalScoreParams) {
      let targetBlock: CompetitionBlock | undefined

      for (const block of this.blocks) {
        const fight = block.fights.find((f) =>
          fightId > 0 ? f.id === fightId : f.number === fightNumber
        )
        if (fight) {
          fight.fighter1Score = f1Score
          fight.fighter2Score = f2Score
          targetBlock = block

          const drafts = readFightResultDrafts(this.tournamentId, this.nominationId)
          drafts[String(fight.id)] = {
            blockId: block.id,
            competitor1Score: f1Score,
            competitor2Score: f2Score
          }
          writeFightResultDrafts(this.tournamentId, this.nominationId, drafts)
          break
        }
      }

      if (targetBlock?.type === 'GROUP') {
        updateGroupsStatistics(targetBlock.groups, targetBlock.fightsBlocks)
      }
    },

    async saveFightResults({ blockId, fights }: SaveFightResultParams) {
      if (!fights.length) return
      const drafts = readFightResultDrafts(this.tournamentId, this.nominationId)

      fights.forEach((fight) => {
        drafts[String(fight.id)] = {
          blockId,
          competitor1Score: fight.fighter1Score,
          competitor2Score: fight.fighter2Score
        }
      })
      writeFightResultDrafts(this.tournamentId, this.nominationId, drafts)

      const { data } = await http.patch(API_ROUTES.COMPETITION.SAVE_RESULTS, {
        block_id: blockId,
        fights: fights.map((fight) => ({
          fight_id: fight.id,
          competitor1_score: fight.fighter1Score,
          competitor2_score: fight.fighter2Score
        }))
      })

      const nextDrafts = readFightResultDrafts(this.tournamentId, this.nominationId)
      fights.forEach((fight) => {
        delete nextDrafts[String(fight.id)]
      })
      writeFightResultDrafts(this.tournamentId, this.nominationId, nextDrafts)
      this.applyCompetitionState(data)
    },

    async swapBracketSlots(blockId: number, sourcePosition: number, targetPosition: number) {
      const { data } = await http.patch(API_ROUTES.COMPETITION.SWAP_BRACKET_SLOTS, {
        block_id: blockId,
        source_position: sourcePosition,
        target_position: targetPosition
      })
      this.applyCompetitionState(data)
    },

    async resolveTie(pendingTie: PendingTie, orderedCompetitorIds: number[]) {
      const { data } = await http.post(API_ROUTES.COMPETITION.RESOLVE_TIES, {
        tournament_id: this.tournamentId,
        nomination_id: this.nominationId,
        group_id: pendingTie.groupId ?? undefined,
        block_id: pendingTie.blockId,
        tie_scope: pendingTie.scope ?? 'GROUP',
        ordered_competitor_ids: orderedCompetitorIds
      })
      this.applyCompetitionState(data)
    },

    async finishCompetition() {
      const { data } = await http.post(API_ROUTES.COMPETITION.FINISH, {
        tournament_id: this.tournamentId,
        nomination_id: this.nominationId
      })
      this.applyCompetitionState(data)
    },

    setGroups(groups: Group[]) {
      const activeBlock = this.blocks.find((block) => block.id === this.activeBlockId)
      if (!activeBlock || activeBlock.type !== 'GROUP') return
      activeBlock.groups = [...groups]
      updateGroupsStatistics(activeBlock.groups, activeBlock.fightsBlocks)
    },

    setFightsBlocks(blocks: BlockData[]) {
      const activeBlock = this.blocks.find((block) => block.id === this.activeBlockId)
      if (!activeBlock || activeBlock.type !== 'GROUP') return
      activeBlock.fightsBlocks = blocks
      activeBlock.fights = blocks.flatMap((block) => block.fights)
      updateGroupsStatistics(activeBlock.groups, activeBlock.fightsBlocks)
    },

    updateStageData(groups: Group[], blocks: BlockData[]) {
      this.setGroups(groups)
      this.setFightsBlocks(blocks)
    }
  },

  getters: {
    getTournamentId: (state) => state.tournamentId,

    getNominationId: (state) => state.nominationId,

    getTournamentCompetitors: (state) => state.tournamentCompetitors,

    getBlocks: (state) => state.blocks,

    getActiveBlock: (state) =>
      state.blocks.find((block) => block.id === state.activeBlockId) ?? null,

    getGroups: (state) =>
      state.blocks.find((block) => block.id === state.activeBlockId && block.type === 'GROUP')
        ?.groups ?? [],

    getFightsBlocks: (state) =>
      state.blocks.find((block) => block.id === state.activeBlockId && block.type === 'GROUP')
        ?.fightsBlocks ?? [],

    getPlacements: (state) => state.placements,

    getIsFinished: (state) => state.isFinished,

    getPendingTie: (state) => state.pendingTie,

    getNominationFighters: (state) => {
      const fightersStore = useFightersListStore()
      const currentNominationFighterIds = new Set(
        state.tournamentCompetitors
          .filter((c) => c.nomination_id === state.nominationId)
          .map((c) => c.fighter_id)
      )

      return fightersStore.fightersList.filter((f) => currentNominationFighterIds.has(f.id))
    }
  }
})
