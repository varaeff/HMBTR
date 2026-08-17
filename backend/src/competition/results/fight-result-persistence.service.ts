import { BadRequestException, Injectable } from '@nestjs/common';
import {
  fightScoreUpdateData,
  submittedRoundScores,
} from '../../fights/fight-score-data';
import type { PrismaTx } from '../competition-internal.types';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';
import type {
  EvaluatedFightResult,
  ResultEvaluationBundle,
  ResultFight,
  ResultSubmission,
} from './result-types';

@Injectable()
export class FightResultPersistenceService {
  constructor(private readonly scoringService: CompetitionScoringService) {}

  async persistEvaluatedResultsTx(
    tx: PrismaTx,
    bundle: ResultEvaluationBundle,
  ) {
    await Promise.all(
      bundle.evaluatedResults.map((result) =>
        this.persistEvaluatedResultTx(tx, result),
      ),
    );
  }

  async persistEvaluatedResultTx(tx: PrismaTx, result: EvaluatedFightResult) {
    await tx.fights.update({
      where: { id: result.submission.fight_id },
      data: {
        ...fightScoreUpdateData(result.rawEvaluation),
        winner_id: result.winnerId,
        is_finished: true,
      },
    });
    // Round-score rows are snapshots of the judge-entered score, before warnings.
    await this.scoringService.replaceFightRoundScoresTx(
      tx,
      result.submission.fight_id,
      submittedRoundScores(result.submission, result.roundTiming),
    );
    await tx.fight_warnings.deleteMany({
      where: { fight_id: result.submission.fight_id },
    });
    if (result.resultEvaluation.warnings.length) {
      await tx.fight_warnings.createMany({
        data: result.resultEvaluation.warnings.map((warning) => ({
          fight_id: result.submission.fight_id,
          competitor_id: warning.competitorId,
          round: warning.round,
          reason: warning.reason,
        })),
      });
    }
  }

  getEvaluatedResultOrThrow(
    bundle: ResultEvaluationBundle,
    fight: ResultFight,
    submission: ResultSubmission,
  ) {
    const result = bundle.evaluatedResults.find(
      (item) => item.fight.id === fight.id,
    );
    if (!result) {
      throw new BadRequestException('Fight result cannot be evaluated');
    }
    if (result.submission.fight_id !== submission.fight_id) {
      throw new BadRequestException('Fight result cannot be evaluated');
    }
    return result;
  }
}
