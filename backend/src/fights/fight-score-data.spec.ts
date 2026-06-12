import { BadRequestException } from '@nestjs/common';
import {
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
});
