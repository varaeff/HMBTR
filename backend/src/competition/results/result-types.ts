import type {
  evaluateSubmittedFightScoreWithWarnings,
  evaluateSubmittedRawFightScoreForPersistence,
} from '../../fights/fight-score-data';
import type { SaveCompetitionResultFightDto } from '../dto/save-competition-results.dto';

export interface ResultFight {
  id: number;
  competitor1_id: number;
  competitor2_id: number;
  rounds: number | null;
  round_win: boolean | null;
  main_round_time?: number | null;
  additional_round_time?: number | null;
  forfeit_card_id: number | null;
  forfeit_withdrawal_id: number | null;
  bracket_round?: number | null;
  is_bronze?: boolean | null;
}

export interface ResultBlock {
  id: number;
  tournament_id: number;
  nomination_id: number;
  type: string;
  status: string;
  lifecycle_state: string;
  fights: ResultFight[];
  groups?: Array<{ id: number }>;
  tournament_nomination: {
    is_finished: boolean;
    nomination: {
      rounds: number;
      round_win: boolean;
      main_round_time?: number;
      additional_round_time?: number;
    };
  };
  round_states: Array<{
    id: number;
    round: number;
    pairs_fixed: boolean;
    results_fixed: boolean;
  }>;
}

export type ResultSubmission = SaveCompetitionResultFightDto;

export interface EvaluatedFightResult {
  fight: ResultFight;
  submission: ResultSubmission;
  roundTiming: {
    rounds: number;
    main_round_time: number;
    additional_round_time: number;
  };
  rawEvaluation: ReturnType<
    typeof evaluateSubmittedRawFightScoreForPersistence
  >;
  resultEvaluation: ReturnType<typeof evaluateSubmittedFightScoreWithWarnings>;
  winnerId: number;
}

export interface ResultEvaluationBundle {
  evaluatedResults: EvaluatedFightResult[];
}

export interface OlympicRoundPlan {
  round: number;
  state: ResultBlock['round_states'][number];
  roundFights: ResultFight[];
}
