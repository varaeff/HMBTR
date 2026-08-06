export interface SubmittedRoundScore {
  competitor1_score: number;
  competitor2_score: number;
}

export interface SubmittedFightScore {
  round_scores?: SubmittedRoundScore[];
  warnings?: SubmittedFightWarning[];
}

export interface SubmittedFightWarning {
  competitor_id: number;
  round: number;
  reason: string;
}

export interface FightScoreUpdateData {
  competitor1_score: number;
  competitor2_score: number;
}

export interface FightRoundScoreCreateData {
  round: number;
  competitor1_score: number;
  competitor2_score: number;
}
