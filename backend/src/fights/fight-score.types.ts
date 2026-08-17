export interface SubmittedRoundScore {
  competitor1_score: number;
  competitor2_score: number;
  duration_seconds?: number;
}

export interface SubmittedFightScore {
  round_scores?: SubmittedRoundScore[];
  warnings?: SubmittedFightWarning[];
}

export interface FightRoundTimeSnapshot {
  rounds: number;
  main_round_time: number;
  additional_round_time: number;
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
  duration_seconds: number;
}
