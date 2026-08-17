import { BadRequestException, Injectable } from '@nestjs/common';
import {
  evaluateSubmittedFightScoreWithWarnings,
  evaluateSubmittedRawFightScoreForPersistence,
  scoringRules,
} from '../../fights/fight-score-data';
import { isForfeitFight } from '../competition.helpers';
import type {
  ResultBlock,
  ResultEvaluationBundle,
  ResultFight,
  ResultSubmission,
} from './result-types';

@Injectable()
export class FightResultEvaluationService {
  evaluateSubmissions(
    block: ResultBlock,
    submissions: ResultSubmission[],
    candidateFights = block.fights,
  ): ResultEvaluationBundle {
    const evaluatedResults = submissions.flatMap((submission) => {
      const fight = this.findFight(candidateFights, submission.fight_id);
      if (!fight) {
        throw new BadRequestException('Fight does not belong to the block');
      }
      // Persisted card forfeits are server-generated and must not be overwritten.
      if (isForfeitFight(fight)) {
        return [];
      }

      const rules = scoringRules({
        rounds: fight.rounds ?? block.tournament_nomination.nomination.rounds,
        round_win:
          fight.round_win ?? block.tournament_nomination.nomination.round_win,
      });
      const roundTiming = {
        rounds: fight.rounds ?? block.tournament_nomination.nomination.rounds,
        main_round_time:
          fight.main_round_time ??
          block.tournament_nomination.nomination.main_round_time ??
          0,
        additional_round_time:
          fight.additional_round_time ??
          block.tournament_nomination.nomination.additional_round_time ??
          0,
      };
      const rawEvaluation = evaluateSubmittedRawFightScoreForPersistence(
        rules,
        submission,
      );
      // Warnings can turn a raw draw into a valid fixed result.
      const resultEvaluation = evaluateSubmittedFightScoreWithWarnings(
        rules,
        submission,
        fight.competitor1_id,
        fight.competitor2_id,
        true,
      );
      const winnerId =
        resultEvaluation.winnerSide === 1
          ? fight.competitor1_id
          : fight.competitor2_id;

      return [
        {
          fight,
          submission,
          roundTiming,
          rawEvaluation,
          resultEvaluation,
          winnerId,
        },
      ];
    });

    return { evaluatedResults };
  }

  private findFight(fights: ResultFight[], fightId: number) {
    return fights.find((fight) => fight.id === fightId);
  }
}
