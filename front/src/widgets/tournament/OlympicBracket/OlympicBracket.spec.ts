import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import OlympicBracket from './OlympicBracket.vue'
import OlympicPendingPairs from './OlympicPendingPairs.vue'
import OlympicRoundSection from './OlympicRoundSection.vue'
import {
  createOlympicBracketView,
  getOlympicDeletionCounts,
  getPendingPairSlots
} from './olympicBracketView'
import type {
  BracketSlot,
  CompetitionBlock,
  CompetitionRoundState,
  FightData,
  Fighter,
  GroupFighter
} from '@/model'
import type { RoundScore } from '@shared/fightScoring'

const fighter = (id: number, surname = `Fighter ${id}`): Fighter => ({
  id,
  name: `Name ${id}`,
  surname,
  birthday: null,
  country: 'Georgia',
  city: 'Tbilisi',
  club: `Club ${id}`
})

const groupFighter = (id: number, competitorId = id): GroupFighter => ({
  ...fighter(id),
  competitorId,
  wins: 0,
  diff: 0
})

const slot = (position: number, competitorId = position): BracketSlot => ({
  id: position,
  competitorId,
  seedPosition: position,
  slotPosition: position,
  fighter: groupFighter(position, competitorId)
})

const fight = ({
  id,
  number,
  round,
  position,
  winnerId,
  isFinished = Boolean(winnerId),
  isResultValid = Boolean(winnerId),
  isBronze = false
}: {
  id: number
  number: number
  round: number
  position: number
  winnerId?: number
  isFinished?: boolean
  isResultValid?: boolean
  isBronze?: boolean
}): FightData => ({
  id,
  number,
  bracketRound: round,
  bracketPosition: position,
  fighter1: fighter(number * 10 + 1),
  fighter2: fighter(number * 10 + 2),
  fighter1Score: 0,
  fighter2Score: 0,
  roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
  rounds: 1,
  roundWin: false,
  isResultValid,
  isFinished,
  winnerId,
  isBronze
})

const block = ({
  fights,
  slots,
  roundStates
}: {
  fights: FightData[]
  slots: BracketSlot[]
  roundStates: CompetitionRoundState[]
}): CompetitionBlock => ({
  id: 10,
  type: 'OLYMPIC',
  stage: 1,
  status: 'ACTIVE',
  lifecycleState: 'FIGHTS_EDITABLE',
  groups: [],
  fights,
  fightsBlocks: [],
  bracketSlots: slots,
  roundStates
})

const createI18n = async () => {
  const instance = i18next.createInstance()

  await instance.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          tournamentPage1_4Final: 'Quarterfinal',
          tournamentPageSemifinals: 'Semifinals',
          tournamentPageFinal: 'Final',
          tournamentPageRound: 'Round',
          tournamentPageBronzeFight: 'Bronze',
          tournamentPageLifecycleFORMATION_EDITABLE: 'Formation editable',
          tournamentPageLifecycleFIGHTS_EDITABLE: 'Fights editable',
          tournamentPageLifecycleRESULTS_FIXED: 'Results fixed',
          tournamentPageFixResults: 'Fix results',
          tournamentPageFixFinalResults: 'Fix final results',
          tournamentPageCancelResultsFixation: 'Cancel results',
          tournamentPageCancelPairFixation: 'Cancel pairs',
          tournamentPageReturnPreviousRound: 'Previous round',
          tournamentPageReturnPreviousStage: 'Previous stage',
          tournamentPageFixPairs: 'Fix pairs'
        }
      }
    }
  })

  return instance
}

describe('olympicBracketView', () => {
  it('sorts rounds and fights and separates final and bronze fights', () => {
    const bronze = fight({ id: 5, number: 5, round: 3, position: 1, isBronze: true })
    const final = fight({ id: 4, number: 4, round: 3, position: 1 })
    const firstSemi = fight({ id: 2, number: 2, round: 2, position: 2 })
    const secondSemi = fight({ id: 3, number: 3, round: 2, position: 1 })
    const firstRound = fight({ id: 1, number: 1, round: 1, position: 1 })
    const view = createOlympicBracketView(
      block({
        fights: [final, firstSemi, bronze, firstRound, secondSemi],
        slots: [slot(1), slot(2), slot(3), slot(4), slot(5), slot(6), slot(7), slot(8)],
        roundStates: [{ round: 3, pairsFixed: true, resultsFixed: false }]
      })
    )

    expect(view.rounds.map((round) => round.round)).toEqual([1, 2, 3])
    expect(view.rounds[1].fights.map((item) => item.id)).toEqual([3, 2])
    expect(view.finalRound?.fights).toEqual([final])
    expect(view.bronzeFights).toEqual([bronze])
    expect(view.preliminaryRounds.map((round) => round.round)).toEqual([1, 2])
    expect(view.finalBoundaryFights).toEqual([final, bronze])
  })

  it('derives pending pairs only from completed previous-round winners', () => {
    const olympicBlock = block({
      slots: [slot(1), slot(2), slot(3), slot(4), slot(5), slot(6), slot(7), slot(8)],
      fights: [
        fight({ id: 1, number: 1, round: 1, position: 1, winnerId: 1 }),
        fight({ id: 2, number: 2, round: 1, position: 2, winnerId: 3 }),
        fight({ id: 3, number: 3, round: 1, position: 3, winnerId: 5 }),
        fight({ id: 4, number: 4, round: 1, position: 4, winnerId: 8 })
      ],
      roundStates: [{ round: 2, pairsFixed: false, resultsFixed: false }]
    })

    expect(getPendingPairSlots(olympicBlock).map((item) => item.competitorId)).toEqual([
      1, 3, 5, 8
    ])
    expect(createOlympicBracketView(olympicBlock).slotPairs.map((pair) => pair.length)).toEqual([
      2, 2
    ])
  })

  it('hides pending pairs when pairs are fixed or semifinal boundary is reached', () => {
    const fights = [
      fight({ id: 1, number: 1, round: 2, position: 1, winnerId: 1 }),
      fight({ id: 2, number: 2, round: 2, position: 2, winnerId: 3 })
    ]
    const slots = [slot(1), slot(2), slot(3), slot(4), slot(5), slot(6), slot(7), slot(8)]

    expect(
      getPendingPairSlots(
        block({
          slots,
          fights,
          roundStates: [{ round: 3, pairsFixed: false, resultsFixed: false }]
        })
      )
    ).toEqual([])
    expect(
      getPendingPairSlots(
        block({
          slots,
          fights: [],
          roundStates: [{ round: 1, pairsFixed: true, resultsFixed: false }]
        })
      )
    ).toEqual([])
  })

  it('counts deleted final-round fights, bronze fights, and attached cards', () => {
    const olympicBlock = block({
      slots: [slot(1), slot(2), slot(3), slot(4)],
      fights: [
        fight({ id: 1, number: 1, round: 2, position: 1 }),
        fight({ id: 2, number: 2, round: 2, position: 1, isBronze: true }),
        fight({ id: 3, number: 3, round: 1, position: 1 })
      ],
      roundStates: []
    })

    expect(getOlympicDeletionCounts(olympicBlock, 2, { 1: 1, 2: 2, 3: 5 })).toEqual({
      fights: 2,
      cards: 3
    })
  })
})

describe('OlympicBracket emitted actions', () => {
  it('emits score draft updates from rendered fights', async () => {
    const instance = await createI18n()
    const scores: RoundScore[] = [{ competitor1Score: 3, competitor2Score: 1 }]
    const olympicBlock = block({
      slots: [slot(1), slot(2)],
      fights: [fight({ id: 11, number: 7, round: 1, position: 1 })],
      roundStates: [{ round: 1, pairsFixed: true, resultsFixed: false }]
    })
    const wrapper = mount(OlympicBracket, {
      props: {
        block: olympicBlock,
        hasAccess: true,
        isFixingPairs: false
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          FightCard: {
            props: ['fight'],
            emits: ['update:score'],
            template:
              '<button data-testid="score" @click="$emit(`update:score`, { roundScores: scores })">score</button>',
            data: () => ({ scores })
          }
        }
      }
    })

    await wrapper.find('[data-testid="score"]').trigger('click')

    expect(wrapper.emitted('update-score')).toEqual([
      [{ fightId: 11, fightNumber: 7, scores: { roundScores: scores } }]
    ])
  })

  it('emits round lifecycle actions from round sections', async () => {
    const instance = await createI18n()
    const targetFight = fight({
      id: 12,
      number: 2,
      round: 1,
      position: 1,
      isResultValid: true
    })
    const secondFight = fight({
      id: 13,
      number: 3,
      round: 1,
      position: 2,
      isResultValid: true
    })
    const olympicBlock = block({
      slots: [slot(1), slot(2), slot(3), slot(4)],
      fights: [targetFight, secondFight],
      roundStates: [{ round: 1, pairsFixed: true, resultsFixed: false }]
    })
    const wrapper = mount(OlympicBracket, {
      props: {
        block: olympicBlock,
        hasAccess: true,
        canUseBackwardActions: true,
        isFixingPairs: false
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          FightCard: true,
          Button: { template: '<button v-bind="$attrs"><slot /></button>' }
        }
      }
    })

    await wrapper.findAll('button').find((button) => button.text() === 'Fix results')?.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Cancel pairs')?.trigger('click')

    expect(wrapper.emitted('fix-round-results')).toEqual([
      [{ blockId: 10, round: 1, fights: [targetFight, secondFight] }]
    ])
    expect(wrapper.emitted('cancel-pair-fixation')).toEqual([[{ blockId: 10, round: 1 }]])
  })
})

describe('OlympicPendingPairs emitted actions', () => {
  it('emits slot swaps and pending-pair lifecycle actions', async () => {
    const instance = await createI18n()
    const wrapper = mount(OlympicPendingPairs, {
      props: {
        slotPairs: [[slot(1), slot(2)]],
        hasAccess: true,
        canUseBackwardActions: true,
        isLocked: false,
        isFixingPairs: false,
        latestRound: 1
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          CardStatusIcon: true
        }
      }
    })
    const slotCards = wrapper.findAll('[draggable="true"]')

    await slotCards[0].trigger('dragstart')
    await slotCards[1].trigger('drop')
    await wrapper.findAll('button').find((button) => button.text() === 'Fix pairs')?.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Previous stage')?.trigger('click')

    expect(wrapper.emitted('swap-slots')).toEqual([[1, 2]])
    expect(wrapper.emitted('fix-pairs')).toHaveLength(1)
    expect(wrapper.emitted('rollback-pending-pairs')).toHaveLength(1)
  })
})
