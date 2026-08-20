export const API_ROUTES = {
  FIGHTERS: {
    ROOT: "fighters",
    COUNT: "count",
    BY_ID_PATH: ":id",
    BY_ID: (id: string | number) => `/fighters/${id}`,
  },
  MARSHALS: {
    ROOT: "marshals",
    COUNT: "count",
    CATEGORIES: "categories",
    BY_ID_PATH: ":id",
    BY_ID: (id: string | number) => `/marshals/${id}`,
  },
  NOMINATIONS: {
    ROOT: "nominations",
    BY_ID_PATH: ":id",
    BY_ID: (id: string | number) => `/nominations/${id}`,
  },
  SETTINGS: {
    ROOT: "settings",
    DISCIPLINARY_CARDS: "disciplinary-cards",
  },
  TOURNAMENTS: {
    ROOT: "tournaments",
    COUNT: "count",
    NOMINATION: "nominations",
    MARSHALS: "marshals",
    REPORT: (id: string | number) => `/tournaments/${id}/report`,
    BY_ID: (id: string | number) => `/tournaments/${id}`,
    MARSHALS_BY_TOURNAMENT: (id: string | number) =>
      `/tournaments/${id}/marshals`,
    NOMINATION_BY_TOURNAMENT_AND_NOMINATION: (
      tournamentId: string | number,
      nominationId: string | number,
    ) => `/tournaments/nominations/${tournamentId}/${nominationId}`,
    FINISH_MARSHALS: (id: string | number) =>
      `/tournaments/${id}/marshals/finish`,
    TOURNAMENT_MARSHAL_BY_ID: (id: string | number) =>
      `/tournaments/marshals/${id}`,
  },
  COUNTRIES: {
    ROOT: "countries",
    ONE: "one",
    COUNT: "count",
    BY_ID: (id: string | number) => `/countries/one/${id}`,
  },
  CITIES: {
    BY_PARENT: (countryId: string | number) => `/cities/${countryId}`,
    BY_ID: (id: string | number) => `/cities/one/${id}`,
    ROOT: "cities",
    ONE: "one",
    COUNT: "count",
  },
  CLUBS: {
    BY_PARENT: (cityId: string | number) => `/clubs/${cityId}`,
    BY_ID: (id: string | number) => `/clubs/one/${id}`,
    ROOT: "clubs",
    ONE: "one",
    COUNT: "count",
  },
  USERS: {
    ROOT: "users",
    ADMINS: "admins",
    BY_ID_PATH: ":id",
    BY_ID: (id: string | number) => `/users/${id}`,
    COUNT: "count",
  },
  COMPETITORS: {
    ROOT: "competitors",
    ELIGIBILITY: (tournamentId: string | number) =>
      `/competitors/eligibility/${tournamentId}`,
    BY_TOURNAMENT: (tournamentId: string | number) =>
      `/competitors/${tournamentId}`,
    BY_TOURNAMENT_AND_NOMINATION: (
      tournamentId: string | number,
      nominationId: string | number,
    ) => `/competitors/${tournamentId}/${nominationId}`,
  },
  GROUPS: {
    ROOT: "groups",
    BY_TOURNAMENT: (tournamentId: string | number) =>
      `/groups/tournament/${tournamentId}`,
    BY_TOURNAMENT_AND_NOMINATION: (
      tournamentId: string | number,
      nominationId: string | number,
    ) => `/groups/tournament/${tournamentId}/nomination/${nominationId}`,
    BY_ID: (id: string | number) => `/groups/${id}`,
  },
  GROUP_COMPETITORS: {
    ROOT: "group-competitors",
    BY_GROUP: (groupId: string | number) =>
      `/group-competitors/group/${groupId}`,
    BY_ID: (id: string | number) => `/group-competitors/${id}`,
  },
  DISCIPLINARY_CARDS: {
    ROOT: "disciplinary-cards",
    BY_FIGHTER: (fighterId: string | number) =>
      `/disciplinary-cards/fighter/${fighterId}`,
    BY_TOURNAMENT: (tournamentId: string | number) =>
      `/disciplinary-cards/tournament/${tournamentId}`,
    ACTIVE_BY_TOURNAMENT: (tournamentId: string | number) =>
      `/disciplinary-cards/tournament/${tournamentId}/active`,
    BY_ID: (id: string | number) => `/disciplinary-cards/${id}`,
  },
  RATINGS: {
    ROOT: "ratings",
    BY_NOMINATION: (nominationId: string | number) =>
      `/ratings/nomination/${nominationId}`,
    BY_FIGHTER_PROFILE: (fighterId: string | number) =>
      `/ratings/fighter/${fighterId}/profile`,
    BY_FIGHTER_ELO_PROFILE: (fighterId: string | number) =>
      `/ratings/fighter/${fighterId}/profile/elo`,
    RUSSIA_HMB_ROOT: "ratings/russia-hmb",
    RUSSIA_HMB_CALCULATE: "/ratings/russia-hmb/calculate",
    RUSSIA_HMB_TOURNAMENT_NOMINATION: (
      tournamentId: string | number,
      nominationId: string | number,
    ) => `/ratings/russia-hmb/tournament/${tournamentId}/${nominationId}`,
    RUSSIA_HMB_YEARS: "/ratings/russia-hmb/years",
    RUSSIA_HMB_NOMINATIONS_BY_YEAR: (year: string | number) =>
      `/ratings/russia-hmb/years/${year}/nominations`,
    RUSSIA_HMB_LEADERBOARD: (
      year: string | number,
      nominationId: string | number,
    ) => `/ratings/russia-hmb/years/${year}/nomination/${nominationId}`,
    RUSSIA_HMB_FIGHTER_PROFILE: (fighterId: string | number) =>
      `/ratings/russia-hmb/fighter/${fighterId}/profile`,
  },
  COMPETITION: {
    ROOT: "competition",
    STATE: (tournamentId: string | number, nominationId: string | number) =>
      `/competition/${tournamentId}/${nominationId}`,
    GROUP_BLOCK: "/competition/groups",
    GROUP_FIGHTS: "/competition/groups/fights",
    OLYMPIC_BLOCK: "/competition/olympic",
    OLYMPIC_FIGHTS: "/competition/olympic/fights",
    SWAP_BRACKET_SLOTS: "/competition/bracket-slots/swap",
    FIX_RESULTS: "/competition/lifecycle/results/fix",
    CANCEL_RESULTS_FIXATION: "/competition/lifecycle/results/cancel",
    CANCEL_FIGHTS_FIXATION: "/competition/lifecycle/fights/cancel",
    ROLLBACK: "/competition/lifecycle/rollback",
    RESOLVE_TIES: "/competition/resolve-ties",
    FINISH: "/competition/finish",
    WITHDRAWAL_NO_SHOW: "/competition/withdrawals/no-show",
    WITHDRAWAL_FIGHT: "/competition/withdrawals/fight",
    WITHDRAWAL_CANCEL: "/competition/withdrawals/cancel",
  },
} as const;
