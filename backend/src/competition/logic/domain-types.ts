export type RankedCompetitor = {
  competitorId: number;
  wins: number;
  diff: number;
};

export type RankedGroup = {
  name: string;
  ranked: RankedCompetitor[];
};

export type OlympicAdvancer = RankedCompetitor & {
  groupName: string;
  groupPlace: number;
};

export type SeedCompetitor = {
  id: number;
  fighter_id: number;
  fighter?: {
    city_id?: number | null;
    club_id?: number | null;
  } | null;
};

export type OlympicSeedCompetitor = SeedCompetitor & {
  olympicGroupName?: string;
  olympicGroupPlace?: number;
};

export type GroupInput<T> = {
  name: string;
  competitors: T[];
};
