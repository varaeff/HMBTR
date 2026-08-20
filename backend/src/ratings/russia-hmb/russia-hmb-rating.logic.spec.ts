import { calculateRussiaHmbRatings } from './russia-hmb-rating.logic';
import type { RussiaHmbCalculationInput } from './russia-hmb-rating.types';

const baseInput = (): RussiaHmbCalculationInput => ({
  coefficient: 1,
  participants: [
    { competitorId: 101, fighterId: 1 },
    { competitorId: 202, fighterId: 2 },
    { competitorId: 303, fighterId: 3 },
  ],
  fights: [],
  placements: [],
  penalties: [],
});

describe('Russia HMB rating logic', () => {
  it('counts winner, total-score close loss and coefficient points', () => {
    const input = baseInput();
    input.coefficient = 2;
    input.fights = [
      {
        id: 1,
        competitor1Id: 101,
        competitor2Id: 202,
        winnerCompetitorId: 101,
        competitor1Score: 10,
        competitor2Score: 5,
        isFinished: true,
        roundWin: false,
        roundScores: [],
      },
    ];

    expect(calculateRussiaHmbRatings(input)).toEqual([
      expect.objectContaining({
        competitorId: 101,
        qcPoints: 2,
        points: 4,
      }),
      expect.objectContaining({
        competitorId: 202,
        qcPoints: 1,
        points: 2,
      }),
      expect.objectContaining({
        competitorId: 303,
        qcPoints: 0,
        points: 0,
      }),
    ]);
  });

  it('counts total-score loser round win or draw once', () => {
    const input = baseInput();
    input.fights = [
      {
        id: 1,
        competitor1Id: 101,
        competitor2Id: 202,
        winnerCompetitorId: 101,
        competitor1Score: 20,
        competitor2Score: 8,
        isFinished: true,
        roundWin: false,
        roundScores: [
          { round: 1, competitor1Score: 5, competitor2Score: 5 },
          { round: 2, competitor1Score: 15, competitor2Score: 3 },
        ],
      },
    ];

    const loser = calculateRussiaHmbRatings(input).find(
      (result) => result.competitorId === 202,
    );

    expect(loser).toMatchObject({ qcPoints: 1, points: 1 });
  });

  it('round-win loser ignores close aggregate and uses only round performance', () => {
    const input = baseInput();
    input.fights = [
      {
        id: 1,
        competitor1Id: 101,
        competitor2Id: 202,
        winnerCompetitorId: 101,
        competitor1Score: 10,
        competitor2Score: 9,
        isFinished: true,
        roundWin: true,
        roundScores: [
          { round: 1, competitor1Score: 5, competitor2Score: 4 },
          { round: 2, competitor1Score: 5, competitor2Score: 4 },
        ],
      },
      {
        id: 2,
        competitor1Id: 101,
        competitor2Id: 303,
        winnerCompetitorId: 101,
        competitor1Score: 10,
        competitor2Score: 9,
        isFinished: true,
        roundWin: true,
        roundScores: [
          { round: 1, competitor1Score: 5, competitor2Score: 5 },
          { round: 2, competitor1Score: 5, competitor2Score: 4 },
        ],
      },
    ];

    const results = calculateRussiaHmbRatings(input);

    expect(results.find((result) => result.competitorId === 202)).toMatchObject({
      qcPoints: 0,
    });
    expect(results.find((result) => result.competitorId === 303)).toMatchObject({
      qcPoints: 1,
    });
  });

  it('adds placement points and subtracts no-show, yellow and active-red penalties', () => {
    const input = baseInput();
    input.placements = [
      { competitorId: 101, place: 1 },
      { competitorId: 202, place: 2 },
      { competitorId: 303, place: 3 },
    ];
    input.penalties = [
      {
        competitorId: 101,
        noShowPenaltyCount: 1,
        yellowCardsCount: 2,
        activeRedCardsCount: 1,
      },
    ];

    const result = calculateRussiaHmbRatings(input).find(
      (item) => item.competitorId === 101,
    );

    expect(result).toMatchObject({
      qnPoints: 6,
      qmPoints: 60,
      noShowPenaltyCount: 1,
      yellowCardsCount: 2,
      activeRedCardsCount: 1,
      points: -54,
    });
  });

  it('keeps technical forfeit fight winner points from persisted result', () => {
    const input = baseInput();
    input.fights = [
      {
        id: 1,
        competitor1Id: 101,
        competitor2Id: 202,
        winnerCompetitorId: 101,
        competitor1Score: 10,
        competitor2Score: 0,
        isFinished: true,
        roundWin: false,
        technicalLoserCompetitorId: 202,
        roundScores: [],
      },
    ];

    expect(calculateRussiaHmbRatings(input)).toEqual([
      expect.objectContaining({ competitorId: 101, points: 2 }),
      expect.objectContaining({ competitorId: 202, points: 0 }),
      expect.objectContaining({ competitorId: 303, points: 0 }),
    ]);
  });

  it('does not award loss points for card technical losses even when a persisted round is drawn', () => {
    const input = baseInput();
    input.fights = [
      {
        id: 1,
        competitor1Id: 101,
        competitor2Id: 202,
        winnerCompetitorId: 101,
        competitor1Score: 10,
        competitor2Score: 0,
        isFinished: true,
        roundWin: false,
        technicalLoserCompetitorId: 202,
        roundScores: [{ round: 1, competitor1Score: 0, competitor2Score: 0 }],
      },
    ];

    const loser = calculateRussiaHmbRatings(input).find(
      (result) => result.competitorId === 202,
    );

    expect(loser).toMatchObject({ qcPoints: 0, points: 0 });
  });

  it('does not award loss points for warning technical losses', () => {
    const input = baseInput();
    input.fights = [
      {
        id: 1,
        competitor1Id: 101,
        competitor2Id: 202,
        winnerCompetitorId: 101,
        competitor1Score: 10,
        competitor2Score: 0,
        isFinished: true,
        roundWin: false,
        technicalLoserCompetitorId: 202,
        roundScores: [{ round: 1, competitor1Score: 0, competitor2Score: 0 }],
      },
    ];

    const loser = calculateRussiaHmbRatings(input).find(
      (result) => result.competitorId === 202,
    );

    expect(loser).toMatchObject({ qcPoints: 0, points: 0 });
  });
});
