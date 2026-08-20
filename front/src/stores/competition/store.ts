import { defineStore } from 'pinia'
import type {
  BlockData,
  CompetitionBlock,
  CompetitionPlacement,
  Competitor,
  FightData,
  Group,
  ActiveWithdrawalSummary,
  NominationCompetitor,
  PendingTie
} from '@/model/competition'
import { useFightersListStore } from '@/stores/fightersList'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'
import type { FightScoringRules, FightWarning, RoundScore } from '@shared/fightScoring'
import * as competitionCommands from './commands'
import type { RawCompetitionState } from './mapper'
import {
  clearFightResultDrafts,
  updateCompetitionFightScoreDraft
} from './scoreDrafts'
import { mapAndPersistCompetitionState } from './stateApplication'

interface CompetitionState {
  tournamentCompetitors: Competitor[]
  blocks: CompetitionBlock[]
  activeBlockId: number | null
  placements: CompetitionPlacement[]
  activeWithdrawals: ActiveWithdrawalSummary[]
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
    activeWithdrawals: [],
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
      this.activeWithdrawals = []
      this.pendingTie = null
      this.isFinished = false
      this.isRegistrationOpen = null
    },

    setRegistrationOpen(isOpen: boolean) {
      this.isRegistrationOpen = isOpen
    },

    applyCompetitionState(payload: RawCompetitionState) {
      const fightersStore = useFightersListStore()
      const mapped = mapAndPersistCompetitionState({
        payload,
        tournamentId: this.tournamentId,
        nominationId: this.nominationId,
        resolveFighterById: fightersStore.getFighterById
      })

      this.blocks = mapped.blocks
      this.activeBlockId = mapped.activeBlockId
      this.placements = mapped.placements
      this.activeWithdrawals = mapped.activeWithdrawals
      this.pendingTie = mapped.pendingTie
      this.isFinished = mapped.isFinished
      this.isRegistrationOpen = mapped.isRegistrationOpen
      this.scoringRules = mapped.scoringRules
    },

    async loadCompetitionState() {
      const currentTournamentId = this.tournamentId
      const currentNomId = this.nominationId
      const data = await competitionCommands.fetchCompetitionState(
        this.tournamentId,
        this.nominationId
      )

      if (this.tournamentId === currentTournamentId && this.nominationId === currentNomId) {
        this.applyCompetitionState(data)
      }
    },

    async setCompetitors() {
      const currentNomId = this.nominationId
      const data = await competitionCommands.fetchTournamentCompetitors(this.tournamentId)

      if (this.nominationId === currentNomId) {
        this.tournamentCompetitors = data
      }
    },

    async getRegistrationEligibility() {
      return competitionCommands.fetchRegistrationEligibility(this.tournamentId)
    },

    async registerFighter(fighterId: number, nominationId: number) {
      const competitor = await competitionCommands.registerFighter(
        this.tournamentId,
        fighterId,
        nominationId
      )
      this.tournamentCompetitors.push(competitor)
    },

    async deleteCompetitor(competitorId: number) {
      await competitionCommands.deleteCompetitor(competitorId)
      const index = this.tournamentCompetitors.findIndex((c) => c.id === competitorId)
      if (index !== -1) {
        this.tournamentCompetitors.splice(index, 1)
      }
    },

    async createNoShowWithdrawal(competitorId: number) {
      const data = await competitionCommands.createNoShowWithdrawal(
        this.tournamentId,
        this.nominationId,
        competitorId
      )
      this.applyCompetitionState(data)
    },

    async createFightWithdrawal(payload: {
      fightId: number
      competitorId: number
      reason: string
      isExcused: boolean
    }) {
      const data = await competitionCommands.createFightWithdrawal(payload)
      this.applyCompetitionState(data)
    },

    async cancelWithdrawal(withdrawalId: number) {
      const data = await competitionCommands.cancelWithdrawal(withdrawalId)
      this.applyCompetitionState(data)
    },

    async createGroupBlock() {
      const data = await competitionCommands.createGroupBlock(this.tournamentId, this.nominationId)
      this.applyCompetitionState(data)
    },

    async generateGroupFights(blockId: number) {
      const activeBlock = this.blocks.find((block) => block.id === blockId)
      if (!activeBlock || activeBlock.type !== 'GROUP') return

      const data = await competitionCommands.generateGroupFights(blockId, activeBlock.groups)
      this.applyCompetitionState(data)
    },

    async createOlympicBlock(includeThirdPlaces = false) {
      const data = await competitionCommands.createOlympicBlock(
        this.tournamentId,
        this.nominationId,
        includeThirdPlaces
      )
      this.applyCompetitionState(data)
    },

    async generateOlympicFights(blockId: number) {
      const data = await competitionCommands.generateOlympicFights(blockId)
      this.applyCompetitionState(data)
    },

    updateGlobalScore({
      fightId,
      fightNumber,
      roundScores,
      warnings
    }: UpdateGlobalScoreParams) {
      updateCompetitionFightScoreDraft({
        blocks: this.blocks,
        tournamentId: this.tournamentId,
        nominationId: this.nominationId,
        fightId,
        fightNumber,
        roundScores,
        warnings
      })
    },

    async swapBracketSlots(blockId: number, sourcePosition: number, targetPosition: number) {
      const data = await competitionCommands.swapBracketSlots(
        blockId,
        sourcePosition,
        targetPosition
      )
      this.applyCompetitionState(data)
    },

    async resolveTie(pendingTie: PendingTie, orderedCompetitorIds: number[]) {
      const data = await competitionCommands.resolveTie(
        this.tournamentId,
        this.nominationId,
        pendingTie,
        orderedCompetitorIds
      )
      this.applyCompetitionState(data)
    },

    async finishCompetition() {
      const data = await competitionCommands.finishCompetition(this.tournamentId, this.nominationId)
      this.applyCompetitionState(data)
    },

    async fixResults(blockId: number, fights: FightData[], round?: number) {
      const data = await competitionCommands.fixResults(blockId, fights, round)
      clearFightResultDrafts(this.tournamentId, this.nominationId, fights)
      this.applyCompetitionState(data)
    },

    async cancelResultsFixation(blockId: number, round?: number) {
      const data = await competitionCommands.cancelResultsFixation(blockId, round)
      this.applyCompetitionState(data)
    },

    async cancelFightsFixation(blockId: number, round?: number) {
      const data = await competitionCommands.cancelFightsFixation(blockId, round)
      this.applyCompetitionState(data)
    },

    async rollback(blockId: number, round?: number, removeActiveRedCompetitors = false) {
      const data = await competitionCommands.rollback(blockId, round, removeActiveRedCompetitors)
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

    getActiveWithdrawals: (state) => state.activeWithdrawals,

    getIsFinished: (state) => state.isFinished,

    getIsRegistrationOpen: (state) => state.isRegistrationOpen,

    getPendingTie: (state) => state.pendingTie,

    getNominationFighters: (state): NominationCompetitor[] => {
      const fightersStore = useFightersListStore()
      const withdrawalByCompetitorId = new Map(
        state.activeWithdrawals.map((withdrawal) => [withdrawal.competitorId, withdrawal])
      )

      return state.tournamentCompetitors
        .filter((competitor) => competitor.nomination_id === state.nominationId)
        .map((competitor) => {
          const fighter = fightersStore.getFighterById(competitor.fighter_id)

          return {
            ...(fighter ?? {
              id: competitor.fighter_id,
              name: '',
              surname: '',
              patronymic: undefined,
              birthday: null,
              country: '',
              city: '',
              club: undefined,
              pic: undefined
            }),
            competitorId: competitor.id,
            withdrawal: withdrawalByCompetitorId.get(competitor.id) ?? null
          }
        })
    }
  }
})
