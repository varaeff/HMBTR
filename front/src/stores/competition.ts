import { defineStore } from 'pinia'
import http from '@/api/http'
import type {
  BlockData,
  CompetitionBlock,
  CompetitionPlacement,
  Competitor,
  FightData,
  FighterRegistrationEligibility,
  Group,
  PendingTie
} from '@/model'
import { API_ROUTES } from '@shared/routes'
import { useFightersListStore } from '@/stores/fightersList'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'
import { buildSubmittedFightResult } from '@/lib/fightResult'
import type { FightScoringRules, FightWarning, RoundScore } from '@shared/fightScoring'
import { applyFightScoreDraft } from './competitionFightScoring'
import { mapCompetitionState, type RawCompetitionState } from './competitionMapper'
import { readFightResultDrafts, writeFightResultDrafts } from './competitionResultDrafts'

interface CompetitionState {
  tournamentCompetitors: Competitor[]
  blocks: CompetitionBlock[]
  activeBlockId: number | null
  placements: CompetitionPlacement[]
  pendingTie: PendingTie | null
  isFinished: boolean
  isRegistrationOpen: boolean | null
  tournamentId: number
  nominationId: number
  scoringRules: FightScoringRules
}

interface UpdateGlobalScoreParams {
  fightId: number
  fightNumber: number
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
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
    isRegistrationOpen: null,
    tournamentId: 0,
    nominationId: 0,
    scoringRules: { rounds: 1, roundWin: false }
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
      this.isRegistrationOpen = null
    },

    setRegistrationOpen(isOpen: boolean) {
      this.isRegistrationOpen = isOpen
    },

    applyCompetitionState(payload: RawCompetitionState) {
      const drafts = readFightResultDrafts(this.tournamentId, this.nominationId)
      const fightersStore = useFightersListStore()
      const mapped = mapCompetitionState(payload, drafts, {
        resolveFighterById: fightersStore.getFighterById
      })
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
      this.isRegistrationOpen = mapped.isRegistrationOpen
      this.scoringRules = mapped.scoringRules
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

    async getRegistrationEligibility() {
      const { data } = await http.get<FighterRegistrationEligibility[]>(
        API_ROUTES.COMPETITORS.ELIGIBILITY(this.tournamentId)
      )
      return data
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

    async generateOlympicFights(blockId: number) {
      const { data } = await http.post(API_ROUTES.COMPETITION.OLYMPIC_FIGHTS, {
        block_id: blockId
      })
      this.applyCompetitionState(data)
    },

    updateGlobalScore({
      fightId,
      fightNumber,
      roundScores,
      warnings
    }: UpdateGlobalScoreParams) {
      let targetBlock: CompetitionBlock | undefined

      for (const block of this.blocks) {
        const fight = block.fights.find((f) =>
          fightId > 0 ? f.id === fightId : f.number === fightNumber
        )
        if (fight) {
          const drafts = readFightResultDrafts(this.tournamentId, this.nominationId)
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
          writeFightResultDrafts(this.tournamentId, this.nominationId, drafts)
          break
        }
      }

      if (targetBlock?.type === 'GROUP') {
        updateGroupsStatistics(targetBlock.groups, targetBlock.fightsBlocks)
      }
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

    async fixResults(blockId: number, fights: FightData[], round?: number) {
      const { data } = await http.post(API_ROUTES.COMPETITION.FIX_RESULTS, {
        block_id: blockId,
        round,
        fights: fights.map(buildSubmittedFightResult)
      })
      const drafts = readFightResultDrafts(this.tournamentId, this.nominationId)
      fights.forEach((fight) => delete drafts[String(fight.id)])
      writeFightResultDrafts(this.tournamentId, this.nominationId, drafts)
      this.applyCompetitionState(data)
    },

    async cancelResultsFixation(blockId: number, round?: number) {
      const { data } = await http.post(API_ROUTES.COMPETITION.CANCEL_RESULTS_FIXATION, {
        block_id: blockId,
        round
      })
      this.applyCompetitionState(data)
    },

    async cancelFightsFixation(blockId: number, round?: number) {
      const { data } = await http.post(API_ROUTES.COMPETITION.CANCEL_FIGHTS_FIXATION, {
        block_id: blockId,
        round
      })
      this.applyCompetitionState(data)
    },

    async rollback(blockId: number, round?: number, removeActiveRedCompetitors = false) {
      const { data } = await http.post(API_ROUTES.COMPETITION.ROLLBACK, {
        block_id: blockId,
        round,
        remove_active_red_competitors: removeActiveRedCompetitors || undefined
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

    getIsRegistrationOpen: (state) => state.isRegistrationOpen,

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
