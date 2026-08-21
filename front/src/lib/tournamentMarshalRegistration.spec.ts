import { describe, expect, it } from 'vitest'
import {
  canShowAddJudgesButton,
  canShowTournamentMarshalSelector,
  type TournamentMarshalRegistrationState
} from './tournamentMarshalRegistration'

const createState = (
  overrides: Partial<TournamentMarshalRegistrationState> = {}
): TournamentMarshalRegistrationState => ({
  canManageTournamentMarshals: true,
  hasOpenFighterRegistration: true,
  isMarshalRegistrationOpen: false,
  ...overrides
})

describe('tournamentMarshalRegistration', () => {
  it('shows the marshal selector while a nomination registration is open', () => {
    const state = createState({
      isMarshalRegistrationOpen: true
    })

    expect(canShowTournamentMarshalSelector(state)).toBe(true)
    expect(canShowAddJudgesButton(state)).toBe(false)
  })

  it('hides marshal controls when all nomination registrations are closed', () => {
    const state = createState({
      hasOpenFighterRegistration: false,
      isMarshalRegistrationOpen: true
    })

    expect(canShowTournamentMarshalSelector(state)).toBe(false)
    expect(canShowAddJudgesButton(state)).toBe(false)
  })

  it('shows add button again after registration is reopened', () => {
    const state = createState({
      hasOpenFighterRegistration: true,
      isMarshalRegistrationOpen: false
    })

    expect(canShowAddJudgesButton(state)).toBe(true)
    expect(canShowTournamentMarshalSelector(state)).toBe(false)
  })
})
