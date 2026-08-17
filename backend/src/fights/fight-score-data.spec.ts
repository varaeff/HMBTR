import { BadRequestException } from '@nestjs/common';
import {
  evaluateSubmittedFightScoreWithWarnings,
  evaluateSubmittedFightScore,
  evaluateSubmittedRawFightScoreForPersistence,
  fightRoundScoreCreateData,
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

    expect(fightScoreUpdateData(evaluation)).toMatchObject({
      competitor1_score: 6,
      competitor2_score: 5,
    });
    expect(fightRoundScoreCreateData(score)).toEqual([
      {
        round: 1,
        competitor1_score: 4,
        competitor2_score: 1,
        duration_seconds: 0,
      },
      {
        round: 2,
        competitor1_score: 2,
        competitor2_score: 4,
        duration_seconds: 0,
      },
    ]);
  });

  it('fills missing round durations from the fight timing snapshot', () => {
    const score = {
      round_scores: [
        { competitor1_score: 5, competitor2_score: 5 },
        { competitor1_score: 1, competitor2_score: 0 },
        { competitor1_score: 2, competitor2_score: 1, duration_seconds: 45 },
      ],
    };

    expect(
      fightRoundScoreCreateData(score, {
        rounds: 2,
        main_round_time: 90,
        additional_round_time: 30,
      }),
    ).toEqual([
      {
        round: 1,
        competitor1_score: 5,
        competitor2_score: 5,
        duration_seconds: 90,
      },
      {
        round: 2,
        competitor1_score: 1,
        competitor2_score: 0,
        duration_seconds: 90,
      },
      {
        round: 3,
        competitor1_score: 2,
        competitor2_score: 1,
        duration_seconds: 45,
      },
    ]);
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
    expect(fightScoreUpdateData(evaluation)).toMatchObject({
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
      ),
    ).toMatchObject({
      competitor1_score: 8,
      competitor2_score: 12,
    });
  });

  it('turns a third warning into a technical defeat without requiring a scoring winner', () => {
    const score = {
      round_scores: [{ competitor1_score: 0, competitor2_score: 0 }],
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
          round_scores: [{ competitor1_score: 1, competitor2_score: 0 }],
          warnings: [{ competitor_id: 101, round: 1, reason: '   ' }],
        },
        101,
        202,
        false,
      ),
    ).toThrow('Warning reason is required');
  });

  it('allows warnings on any submitted extra round', () => {
    const evaluation = evaluateSubmittedFightScoreWithWarnings(
      { rounds: 1, roundWin: false },
      {
        round_scores: [
          { competitor1_score: 5, competitor2_score: 5 },
          { competitor1_score: 2, competitor2_score: 2 },
          { competitor1_score: 1, competitor2_score: 0 },
        ],
        warnings: [{ competitor_id: 202, round: 3, reason: 'Holding' }],
      },
      101,
      202,
      true,
    );

    expect(evaluation).toMatchObject({ winnerSide: 1, isValidResult: true });
  });

  it('accepts an extra round required only after warning bonuses', () => {
    const score = {
      round_scores: [
        { competitor1_score: 3, competitor2_score: 0 },
        { competitor1_score: 1, competitor2_score: 0 },
      ],
      warnings: [{ competitor_id: 101, round: 1, reason: 'Holding' }],
    };

    const evaluation = evaluateSubmittedFightScoreWithWarnings(
      { rounds: 1, roundWin: false },
      score,
      101,
      202,
      true,
    );

    expect(evaluation).toMatchObject({
      competitor1Total: 4,
      competitor2Total: 3,
      winnerSide: 1,
      isValidResult: true,
    });
  });

  it('keeps raw judge totals for persistence when warnings require an extra round', () => {
    const score = {
      round_scores: [
        { competitor1_score: 3, competitor2_score: 0 },
        { competitor1_score: 1, competitor2_score: 0 },
      ],
      warnings: [{ competitor_id: 101, round: 1, reason: 'Holding' }],
    };

    const evaluation = evaluateSubmittedRawFightScoreForPersistence(
      { rounds: 1, roundWin: false },
      score,
    );

    expect(fightScoreUpdateData(evaluation)).toMatchObject({
      competitor1_score: 4,
      competitor2_score: 0,
    });
    expect(fightRoundScoreCreateData(score)).toEqual([
      {
        round: 1,
        competitor1_score: 3,
        competitor2_score: 0,
        duration_seconds: 0,
      },
      {
        round: 2,
        competitor1_score: 1,
        competitor2_score: 0,
        duration_seconds: 0,
      },
    ]);
  });
});
