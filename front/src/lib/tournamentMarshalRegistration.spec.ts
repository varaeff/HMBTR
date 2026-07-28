import { describe, expect, it } from 'vitest'
import {
  canShowAddJudgesButton,
  canShowTournamentMarshalSelector,
  isTournamentMarshalRegistrationLocked,
  type TournamentMarshalRegistrationState
} from './tournamentMarshalRegistration'

const createState = (
  overrides: Partial<TournamentMarshalRegistrationState> = {}
): TournamentMarshalRegistrationState => ({
  canManageTournamentMarshals: true,
  hasOpenFighterRegistration: true,
  hasTournamentMarshals: false,
  isMarshalRegistrationOpen: false,
  isMarshalsRegistrationClosed: false,
  ...overrides
})

describe('tournamentMarshalRegistration', () => {
  it('keeps the marshal selector open after the first marshal is added during recovery', () => {
    const state = createState({
      hasTournamentMarshals: true,
      isMarshalRegistrationOpen: true,
      isMarshalsRegistrationClosed: true
    })

    expect(isTournamentMarshalRegistrationLocked(state)).toBe(false)
    expect(canShowTournamentMarshalSelector(state)).toBe(true)
    expect(canShowAddJudgesButton(state)).toBe(false)
  })

  it('locks marshal changes after registration is explicitly finished with marshals', () => {
    const state = createState({
      hasTournamentMarshals: true,
      isMarshalRegistrationOpen: false,
      isMarshalsRegistrationClosed: true
    })

    expect(isTournamentMarshalRegistrationLocked(state)).toBe(true)
    expect(canShowTournamentMarshalSelector(state)).toBe(false)
    expect(canShowAddJudgesButton(state)).toBe(false)
  })
})
