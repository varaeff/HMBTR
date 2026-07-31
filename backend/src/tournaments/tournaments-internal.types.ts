export type ReportStorageRow = {
  table_name: string | null;
};

export type CachedReportRow = {
  file_name: string;
  pdf_data_base64: string;
};

export type FighterName = {
  name: string;
  surname: string;
  patronymic?: string | null;
};

export type FighterIdentity = FighterName & {
  id: number;
};

export type NominationDefinition = {
  name_en: string;
  name_ru: string;
  rounds: number;
  round_win: boolean;
};

export type MarshalCategory = {
  name_en: string;
  name_ru: string;
};

export type GroupStanding = {
  competitorId: number;
  fighter: FighterName;
  wins: number;
  diff: number;
  manualPlace?: number;
};

export type TournamentReportFight = {
  fight_number: number;
  group_id: number | null;
  competitor1_id: number | null;
  competitor2_id: number | null;
  competitor1_score: number;
  competitor2_score: number;
  winner_id: number | null;
  competitor1_round1_score: number;
  competitor2_round1_score: number;
  competitor1_round2_score: number;
  competitor2_round2_score: number;
  competitor1_round3_score: number;
  competitor2_round3_score: number;
  competitor1_round4_score: number;
  competitor2_round4_score: number;
  forfeit_card_id: number | null;
  bracket_round: number | null;
  bracket_position: number | null;
  is_bronze: boolean;
  is_finished: boolean;
  competitor1: { fighter: FighterName };
  competitor2: { fighter: FighterName };
  winner: { fighter: FighterName } | null;
  nomination: NominationDefinition;
  warnings: Array<{ competitor_id: number; round: number; reason: string }>;
  round_scores: Array<{
    competitor1_score: number;
    competitor2_score: number;
  }>;
};

export type CardFight = {
  fight_number: number;
  nomination: NominationDefinition;
};

export type TournamentMarshal = {
  marshal: FighterName & {
    category: MarshalCategory;
    country: { name: string };
    city: { name: string };
  };
};

export type DisciplinaryCard = {
  id: number;
  fighter_id: number;
  type: string;
  reason: string;
  fighter: FighterIdentity;
  fight: CardFight;
};

export type TournamentReportGroup = {
  id: number;
  name: string;
  fighters: {
    competitor_id: number;
    competitor: { fighter: FighterName };
  }[];
  placements: {
    place: number;
    competitor_id: number;
  }[];
};

export type TournamentReportBlock = {
  type: string;
  stage: number;
  groups: TournamentReportGroup[];
  fights: TournamentReportFight[];
};

export type TournamentReportNomination = {
  nomination_id: number;
  is_finished: boolean;
  nomination: NominationDefinition;
  placements: {
    place: number;
    competitor: { fighter: FighterName };
  }[];
  blocks: TournamentReportBlock[];
};

export type TournamentReport = {
  name: string;
  event_date: Date | null;
  country: { name: string };
  city: { name: string };
  competitors: {
    nomination_id: number;
  }[];
  marshals: TournamentMarshal[];
  disciplinary_cards: DisciplinaryCard[];
  nominations: TournamentReportNomination[];
};

export type TournamentReportResult = {
  fileName: string;
  pdf: Buffer;
};
