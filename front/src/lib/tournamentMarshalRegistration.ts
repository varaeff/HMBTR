export interface TournamentMarshalRegistrationState {
  canManageTournamentMarshals: boolean
  hasOpenFighterRegistration: boolean
  isMarshalRegistrationOpen: boolean
}

export const canShowAddJudgesButton = (state: TournamentMarshalRegistrationState) =>
  state.canManageTournamentMarshals &&
  state.hasOpenFighterRegistration &&
  !state.isMarshalRegistrationOpen

export const canShowTournamentMarshalSelector = (state: TournamentMarshalRegistrationState) =>
  state.canManageTournamentMarshals &&
  state.hasOpenFighterRegistration &&
  state.isMarshalRegistrationOpen
