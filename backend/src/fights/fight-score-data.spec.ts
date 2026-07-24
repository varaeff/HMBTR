import { BadRequestException } from '@nestjs/common';
import {
  evaluateSubmittedFightScoreWithWarnings,
  evaluateSubmittedFightScore,
  fightScoreUpdateData,
} from './fight-score-data';

describe('submitted fight scores', () => {
  it('derives aggregate totals from round scores', () => {
    const score = {
      round_scores: [
        { competitor1_score: 4, competitor2_score: 1 },
        { competitor1_score: 2, competitor2_score: 4 },
      ],
    };
    const evaluation = evaluateSubmittedFightScore(
      { rounds: 2, roundWin: false },
      score,
      true,
    );

    expect(fightScoreUpdateData(evaluation, score)).toMatchObject({
      competitor1_score: 6,
      competitor2_score: 5,
      competitor1_round1_score: 4,
      competitor2_round2_score: 4,
    });
  });

  it('allows unresolved drafts but rejects them during fixation', () => {
    const score = {
      round_scores: [
        { competitor1_score: 0, competitor2_score: 0 },
        { competitor1_score: 0, competitor2_score: 0 },
        { competitor1_score: 0, competitor2_score: 0 },
        { competitor1_score: 0, competitor2_score: 0 },
      ],
    };

    expect(() =>
      evaluateSubmittedFightScore({ rounds: 3, roundWin: true }, score, false),
    ).not.toThrow();
    expect(() =>
      evaluateSubmittedFightScore({ rounds: 3, roundWin: true }, score, true),
    ).toThrow(BadRequestException);
  });

  it('rejects client-supplied aggregate scores for multi-round fights', () => {
    expect(() =>
      evaluateSubmittedFightScore(
        { rounds: 2, roundWin: false },
        {
          competitor1_score: 100,
          competitor2_score: 0,
          round_scores: [
            { competitor1_score: 1, competitor2_score: 0 },
            { competitor1_score: 0, competitor2_score: 1 },
          ],
        },
        false,
      ),
    ).toThrow('Multi-round fights require round scores only');
  });

  it('applies warning bonuses when determining the winner', () => {
    const score = {
      round_scores: [
        { competitor1_score: 2, competitor2_score: 4 },
        { competitor1_score: 5, competitor2_score: 5 },
        { competitor1_score: 1, competitor2_score: 3 },
      ],
      warnings: [
        { competitor_id: 202, round: 1, reason: 'Passive clinch' },
        { competitor_id: 101, round: 3, reason: 'Late strike' },
      ],
    };

    const evaluation = evaluateSubmittedFightScoreWithWarnings(
      { rounds: 3, roundWin: false },
      score,
      101,
      202,
      true,
    );

    expect(evaluation).toMatchObject({
      competitor1Total: 11,
      competitor2Total: 15,
      winnerSide: 2,
      isValidResult: true,
    });
    expect(fightScoreUpdateData(evaluation, score)).toMatchObject({
      competitor1_score: 11,
      competitor2_score: 15,
    });
    expect(
      fightScoreUpdateData(
        evaluateSubmittedFightScore(
          { rounds: 3, roundWin: false },
          score,
          false,
        ),
        score,
      ),
    ).toMatchObject({
      competitor1_score: 8,
      competitor2_score: 12,
    });
  });

  it('turns a third warning into a technical defeat without requiring a scoring winner', () => {
    const score = {
      competitor1_score: 0,
      competitor2_score: 0,
      warnings: [
        { competitor_id: 101, round: 1, reason: 'First warning' },
        { competitor_id: 101, round: 1, reason: 'Second warning' },
        { competitor_id: 101, round: 1, reason: 'Third warning' },
      ],
    };

    const evaluation = evaluateSubmittedFightScoreWithWarnings(
      { rounds: 1, roundWin: false },
      score,
      101,
      202,
      true,
    );

    expect(evaluation).toMatchObject({
      competitor1Total: 0,
      competitor2Total: 10,
      winnerSide: 2,
      isValidResult: true,
      technicalLoserSide: 1,
    });
  });

  it('rejects warnings without a reason', () => {
    expect(() =>
      evaluateSubmittedFightScoreWithWarnings(
        { rounds: 1, roundWin: false },
        {
          competitor1_score: 1,
          competitor2_score: 0,
          warnings: [{ competitor_id: 101, round: 1, reason: '   ' }],
        },
        101,
        202,
        false,
      ),
    ).toThrow('Warning reason is required');
  });
});
