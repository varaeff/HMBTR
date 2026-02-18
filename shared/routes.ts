export const API_ROUTES = {
  FIGHTERS: {
    ROOT: "fighters",
    COUNT: "count",
    BY_ID: (id: string | number) => `/fighters/${id}`,
  },
  TOURNAMENTS: {
    ROOT: "tournaments",
    COUNT: "count",
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
} as const;
