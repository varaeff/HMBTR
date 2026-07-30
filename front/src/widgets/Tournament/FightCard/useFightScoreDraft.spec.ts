import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { FightData, Fighter } from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'
import { useFightScoreDraft } from './useFightScoreDraft'

interface FightScoreUpdatePayload {
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
}

const fighter = (id: number, surname: string): Fighter => ({
  id,
  name: `Name ${id}`,
  surname,
  birthday: null,
  country: 'Georgia',
  city: 'Tbilisi'
})

const baseFight = (): FightData => ({
  id: 1,
  number: 1,
  fighter1: fighter(1, 'One'),
  fighter2: fighter(2, 'Two'),
  fighter1Score: 0,
  fighter2Score: 0,
  roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
  rounds: 1,
  roundWin: false,
  isResultValid: false
})

const createDraft = (fight: FightData) => {
  const fightRef = ref(fight)
  const updates: FightScoreUpdatePayload[] = []
  const draft = useFightScoreDraft({
    fight: computed(() => fightRef.value),
    hasAccess: computed(() => true),
    canIssueCards: computed(() => true),
    translate: (key, options) => `${key}:${options?.round ?? ''}`,
    emitScoreUpdate: (payload) => {
      updates.push(payload)
    }
  })

  return { draft, fightRef, updates }
}

describe('useFightScoreDraft', () => {
  it('stores sanitized score drafts and emits cloned round scores', () => {
    const { draft, updates } = createDraft(baseFight())

    draft.updateScore(1, 'a12', 0)

    expect(draft.visibleRoundScores.value[0]).toEqual({
      competitor1Score: 12,
      competitor2Score: 0
    })
    expect(updates.at(-1)?.roundScores).toEqual([
      { competitor1Score: 12, competitor2Score: 0 }
    ])
  })

  it('reveals an extra round when a warning makes the effective score tied', () => {
    const { draft, updates } = createDraft({
      ...baseFight(),
      roundScores: [{ competitor1Score: 0, competitor2Score: 3 }]
    })

    draft.issueWarning(2)
    draft.warningIssueReason.value = 'Holding'
    draft.confirmWarningIssue()

    expect(draft.visibleRoundScores.value).toHaveLength(2)
    expect(updates.at(-1)?.warnings).toEqual([
      { competitorId: 2, round: 1, reason: 'Holding' }
    ])
  })
})
