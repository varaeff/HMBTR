import {
  evaluateFightScore,
  formatFightResult,
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

  it('requires and counts a non-draw fourth round when round wins are tied', () => {
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
      '2:1 (5:3, 2:4, 1:1, 3:2)',
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
