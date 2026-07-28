export interface TournamentMarshalRegistrationState {
  canManageTournamentMarshals: boolean
  hasOpenFighterRegistration: boolean
  hasTournamentMarshals: boolean
  isMarshalRegistrationOpen: boolean
  isMarshalsRegistrationClosed: boolean
}

export const isTournamentMarshalRegistrationLocked = (
  state: TournamentMarshalRegistrationState
) =>
  state.isMarshalsRegistrationClosed &&
  state.hasTournamentMarshals &&
  !state.isMarshalRegistrationOpen

export const canShowAddJudgesButton = (state: TournamentMarshalRegistrationState) =>
  state.canManageTournamentMarshals &&
  state.hasOpenFighterRegistration &&
  !state.isMarshalRegistrationOpen &&
  !isTournamentMarshalRegistrationLocked(state)

export const canShowTournamentMarshalSelector = (state: TournamentMarshalRegistrationState) =>
  state.canManageTournamentMarshals &&
  state.hasOpenFighterRegistration &&
  state.isMarshalRegistrationOpen &&
  !isTournamentMarshalRegistrationLocked(state)
