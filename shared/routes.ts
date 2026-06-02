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
  FIGHTS: {
    ROOT: "fights",
    SCORES: "/fights/scores",
    BY_TOURNAMENT: (tournamentId: string | number) =>
      `/fights/tournament/${tournamentId}`,
    BY_GROUP: (groupId: string | number) => `/fights/group/${groupId}`,
    BY_ID: (id: string | number) => `/fights/${id}`,
  },
  DISCIPLINARY_CARDS: {
    ROOT: "disciplinary-cards",
    BY_FIGHTER: (fighterId: string | number) =>
      `/disciplinary-cards/fighter/${fighterId}`,
    BY_TOURNAMENT: (tournamentId: string | number) =>
      `/disciplinary-cards/tournament/${tournamentId}`,
    BY_ID: (id: string | number) => `/disciplinary-cards/${id}`,
  },
  RATINGS: {
    ROOT: "ratings",
    BY_NOMINATION: (nominationId: string | number) =>
      `/ratings/nomination/${nominationId}`,
    BY_FIGHTER_PROFILE: (fighterId: string | number) =>
      `/ratings/fighter/${fighterId}/profile`,
  },
  COMPETITION: {
    ROOT: "competition",
    STATE: (tournamentId: string | number, nominationId: string | number) =>
      `/competition/${tournamentId}/${nominationId}`,
    GROUP_BLOCK: "/competition/groups",
    GROUP_FIGHTS: "/competition/groups/fights",
    OLYMPIC_BLOCK: "/competition/olympic",
    OLYMPIC_FIGHTS: "/competition/olympic/fights",
    SCORES: "/competition/scores",
    SAVE_RESULTS: "/competition/results",
    SWAP_BRACKET_SLOTS: "/competition/bracket-slots/swap",
    RESOLVE_TIES: "/competition/resolve-ties",
    FINISH: "/competition/finish",
  },
} as const;
