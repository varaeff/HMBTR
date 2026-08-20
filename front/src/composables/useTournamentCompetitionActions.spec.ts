import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useTournamentCompetitionActions } from './useTournamentCompetitionActions'
import type { Tournament } from '@/model'

const tournament: Tournament = {
  id: 31,
  name: 'Open Cup',
  event_date: new Date('2026-05-10T00:00:00.000Z'),
  country: 'Georgia',
  city: 'Tbilisi',
  nominations: [
    {
      id: 42,
      tournament_id: 31,
      nomination_id: 5,
      is_open: true,
      stage: 0,
      is_finished: false
    },
    {
      id: 43,
      tournament_id: 31,
      nomination_id: 6,
      is_open: true,
      stage: 0,
      is_finished: false
    }
  ]
}

describe('useTournamentCompetitionActions', () => {
  it('removes a deleted nomination from page-local tournament state', async () => {
    const tournamentRef = ref<Tournament | null>({
      ...tournament,
      nominations: tournament.nominations.map((nomination) => ({ ...nomination }))
    })
    const activeTab = ref(5)
    const deleteTournamentNomination = vi.fn().mockResolvedValue(undefined)

    const actions = useTournamentCompetitionActions({
      tournamentId: ref(31),
      tournament: tournamentRef,
      activeTab,
      blocks: computed(() => []),
      currentLanguage: computed(() => 'en'),
      hasTournamentMarshals: computed(() => true),
      tournamentsListStore: {
        updateTournamentNomination: vi.fn().mockResolvedValue(undefined),
        deleteTournamentNomination
      },
      competitionStore: {
        tournamentCompetitors: [],
        getBlocks: [],
        setRegistrationOpen: vi.fn(),
        deleteCompetitor: vi.fn().mockResolvedValue(undefined),
        createGroupBlock: vi.fn().mockResolvedValue(undefined),
        createOlympicBlock: vi.fn().mockResolvedValue(undefined),
        createNoShowWithdrawal: vi.fn().mockResolvedValue(undefined),
        createFightWithdrawal: vi.fn().mockResolvedValue(undefined),
        cancelWithdrawal: vi.fn().mockResolvedValue(undefined),
        updateGlobalScore: vi.fn(),
        setGroups: vi.fn(),
        resolveTie: vi.fn().mockResolvedValue(undefined),
        swapBracketSlots: vi.fn().mockResolvedValue(undefined),
        generateOlympicFights: vi.fn().mockResolvedValue(undefined),
        fixResults: vi.fn().mockResolvedValue(undefined),
        cancelResultsFixation: vi.fn().mockResolvedValue(undefined),
        cancelFightsFixation: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        setCompetitors: vi.fn().mockResolvedValue(undefined),
        loadCompetitionState: vi.fn().mockResolvedValue(undefined),
        generateGroupFights: vi.fn().mockResolvedValue(undefined),
        finishCompetition: vi.fn().mockResolvedValue(undefined)
      },
      apiUiStore: {
        setError: vi.fn()
      },
      cardsStore: {
        loadTournamentCards: vi.fn().mockResolvedValue(undefined),
        loadTournamentActiveCards: vi.fn().mockResolvedValue(undefined),
        createCard: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn().mockResolvedValue(undefined)
      },
      translate: (key) => key,
      requestBackwardConfirmation: vi.fn(),
      getReportErrorMessage: vi.fn().mockResolvedValue('error'),
      getBlockDeletionCounts: () => ({}),
      getOlympicRoundDeletionCounts: () => ({})
    })

    await actions.deleteNomination()

    expect(deleteTournamentNomination).toHaveBeenCalledWith(31, 5)
    expect(tournamentRef.value?.nominations.map((nomination) => nomination.nomination_id)).toEqual([
      6
    ])
    expect(activeTab.value).toBe(6)
  })
})
