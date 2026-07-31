export interface SubmittedRoundScore {
  competitor1_score: number;
  competitor2_score: number;
}

export interface SubmittedFightScore {
  competitor1_score?: number;
  competitor2_score?: number;
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
  competitor1_round1_score: number;
  competitor2_round1_score: number;
  competitor1_round2_score: number;
  competitor2_round2_score: number;
  competitor1_round3_score: number;
  competitor2_round3_score: number;
  competitor1_round4_score: number;
  competitor2_round4_score: number;
}

export interface FightRoundScoreCreateData {
  round: number;
  competitor1_score: number;
  competitor2_score: number;
}
