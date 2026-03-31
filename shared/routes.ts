export const API_ROUTES = {
  FIGHTERS: {
    ROOT: "fighters",
    COUNT: "count",
    BY_ID: (id: string | number) => `/fighters/${id}`,
  },
  NOMINATIONS: {
    ROOT: "nominations",
  },
  TOURNAMENTS: {
    ROOT: "tournaments",
    COUNT: "count",
    NOMINATION: "nominations",
    BY_ID: (id: string | number) => `/tournaments/${id}`,
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
} as const;
