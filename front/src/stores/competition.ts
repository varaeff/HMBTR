import { defineStore } from 'pinia'
import http from '@/api/http'
import type { BlockData, Competitor } from '@/model'
import { API_ROUTES } from '@shared/routes'
import type { Group } from '@/model'
import { useFightersListStore } from '@/stores/fightersList'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'

interface CompetitionState {
  tournamentCompetitors: Competitor[]
  groups: Group[]
  fightsBlocks: BlockData[]
  tournamentId: number
  nominationId: number
}

interface UpdateGlobalScoreParams {
  fightId: number
  fightNumber: number
  f1Score: number
  f2Score: number
}

const syncGroupStatistics = (groups: Group[], fightsBlocks: BlockData[]) => {
  updateGroupsStatistics(groups, fightsBlocks)
}

export const useCompetitionStore = defineStore({
  id: 'competition',

  state: (): CompetitionState => ({
    tournamentCompetitors: [],
    groups: [],
    fightsBlocks: [],
    tournamentId: 0,
    nominationId: 0
  }),

  actions: {
    setTournamentAndNomination(tournamentId: number, nominationId: number) {
      this.tournamentId = tournamentId
      this.nominationId = nominationId
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

    setGroups(groups: Group[]) {
      this.groups = [...groups]
      syncGroupStatistics(this.groups, this.fightsBlocks)
    },

    setFightsBlocks(blocks: BlockData[]) {
      this.fightsBlocks = blocks
      syncGroupStatistics(this.groups, this.fightsBlocks)
    },

    async updateGlobalScore({ fightId, fightNumber, f1Score, f2Score }: UpdateGlobalScoreParams) {
      for (const block of this.fightsBlocks) {
        const fight = block.fights.find((f) => f.number === fightNumber)
        if (fight) {
          fight.fighter1Score = f1Score
          fight.fighter2Score = f2Score
          break
        }
      }
      syncGroupStatistics(this.groups, this.fightsBlocks)

      if (fightId <= 0) {
        return
      }

      try {
        await http.patch(API_ROUTES.FIGHTS.SCORES, {
          fight_id: fightId,
          competitor1_score: f1Score,
          competitor2_score: f2Score
        })
      } catch (error) {
        console.error('Error saving fight scores:', error)
      }
    },

    updateStageData(groups: Group[], blocks: BlockData[]) {
      this.groups = [...groups]
      this.fightsBlocks = [...blocks]
      syncGroupStatistics(this.groups, this.fightsBlocks)
    }
  },

  getters: {
    getTournamentId: (state) => state.tournamentId,

    getNominationId: (state) => state.nominationId,

    getTournamentCompetitors: (state) => state.tournamentCompetitors,

    getGroups: (state) => state.groups,

    getFightsBlocks: (state) => state.fightsBlocks,

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
