import {
  evaluateFightScore,
  formatFightResult,
  getRequiredRoundScores,
} from '../../../shared/fightScoring';

describe('fight scoring', () => {
  it('determines a total-score winner and formats the breakdown', () => {
    const rounds = [
      { competitor1Score: 3, competitor2Score: 1 },
      { competitor1Score: 5, competitor2Score: 4 },
    ];
    const result = evaluateFightScore({ rounds: 2, roundWin: false }, rounds);

    expect(result).toMatchObject({
      competitor1Total: 8,
      competitor2Total: 5,
      winnerSide: 1,
      isValidResult: true,
    });
    expect(formatFightResult({ rounds: 2, roundWin: false }, result, rounds)).toBe(
      '8:5 (3:1, 5:4)',
    );
  });

  it.each([
    {
      rules: { rounds: 1 as const, roundWin: false },
      winnerSide: 1 as const,
      rounds: [
        { competitor1Score: 5, competitor2Score: 5 },
        { competitor1Score: 1, competitor2Score: 1 },
        { competitor1Score: 2, competitor2Score: 0 },
      ],
    },
    {
      rules: { rounds: 2 as const, roundWin: false },
      winnerSide: 2 as const,
      rounds: [
        { competitor1Score: 3, competitor2Score: 1 },
        { competitor1Score: 1, competitor2Score: 3 },
        { competitor1Score: 4, competitor2Score: 4 },
        { competitor1Score: 0, competitor2Score: 1 },
      ],
    },
    {
      rules: { rounds: 3 as const, roundWin: false },
      winnerSide: 2 as const,
      rounds: [
        { competitor1Score: 2, competitor2Score: 1 },
        { competitor1Score: 1, competitor2Score: 2 },
        { competitor1Score: 3, competitor2Score: 3 },
        { competitor1Score: 0, competitor2Score: 2 },
      ],
    },
  ])('requires extra rounds for tied total-score base rounds', ({ rules, rounds, winnerSide }) => {
    expect(evaluateFightScore(rules, rounds.slice(0, rules.rounds))).toMatchObject({
      requiresTieBreakRound: true,
      isValidResult: false,
    });

    const result = evaluateFightScore(rules, rounds);
    expect(result).toMatchObject({
      winnerSide,
      isValidResult: true,
    });
  });

  it('requires and counts extra rounds until round wins are no longer tied', () => {
    const firstThree = [
      { competitor1Score: 5, competitor2Score: 3 },
      { competitor1Score: 2, competitor2Score: 4 },
      { competitor1Score: 1, competitor2Score: 1 },
    ];
    expect(
      evaluateFightScore({ rounds: 3, roundWin: true }, firstThree),
    ).toMatchObject({ requiresTieBreakRound: true, isValidResult: false });

    const rounds = [
      ...firstThree,
      { competitor1Score: 0, competitor2Score: 0 },
      { competitor1Score: 3, competitor2Score: 2 },
    ];
    const result = evaluateFightScore({ rounds: 3, roundWin: true }, rounds);
    expect(result).toMatchObject({
      competitor1RoundWins: 2,
      competitor2RoundWins: 1,
      winnerSide: 1,
      isValidResult: true,
    });
    expect(formatFightResult({ rounds: 3, roundWin: true }, result, rounds)).toBe(
      '2:1 (5:3, 2:4, 1:1, 0:0, 3:2)',
    );
  });

  it('rejects stale extra rounds after the first decisive extra round', () => {
    const rounds = [
      { competitor1Score: 5, competitor2Score: 5 },
      { competitor1Score: 1, competitor2Score: 0 },
      { competitor1Score: 0, competitor2Score: 1 },
    ];

    expect(evaluateFightScore({ rounds: 1, roundWin: false }, rounds)).toMatchObject({
      isValidDraft: false,
      error: 'Extra round is not required',
    });
    expect(getRequiredRoundScores({ rounds: 1, roundWin: false }, rounds)).toEqual(
      rounds.slice(0, 2),
    );
  });

  it('accepts one won round when the other normal rounds are draws', () => {
    const result = evaluateFightScore(
      { rounds: 3, roundWin: true },
      [
        { competitor1Score: 1, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 0 },
      ],
    );

    expect(result).toMatchObject({ winnerSide: 1, isValidResult: true });
  });

  it('formats a round-win forfeit with the score from every forfeited round', () => {
    const rounds = [
      { competitor1Score: 5, competitor2Score: 0 },
      { competitor1Score: 5, competitor2Score: 0 },
      { competitor1Score: 5, competitor2Score: 0 },
    ];
    const result = evaluateFightScore({ rounds: 3, roundWin: true }, rounds);

    expect(formatFightResult({ rounds: 3, roundWin: true }, result, rounds, true)).toBe(
      '3:0 (5:0, 5:0, 5:0)',
    );
  });
});
