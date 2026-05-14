import {
  findTieForPlaces,
  generateCompetitionGroups,
  rankCompetitors,
  seedOlympicSlots,
} from './competition.logic';

describe('competition logic', () => {
  const competitor = (
    id: number,
    city_id: number,
    club_id?: number | null,
  ) => ({
    id,
    fighter_id: id,
    fighter: { city_id, club_id },
  });

  it('generates balanced groups with the existing 3-6 fighter size scheme', () => {
    const groups = generateCompetitionGroups(
      Array.from({ length: 12 }, (_, index) =>
        competitor(index + 1, index % 3, index % 2),
      ),
      0,
    );

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.competitors.length).sort()).toEqual([
      6, 6,
    ]);
  });

  it('uses manual order before wins and diff when resolving tied places', () => {
    const ranked = rankCompetitors(
      [
        { competitorId: 1, wins: 2, diff: 4 },
        { competitorId: 2, wins: 2, diff: 4 },
        { competitorId: 3, wins: 1, diff: 2 },
      ],
      [2, 1],
    );

    expect(ranked.map((item) => item.competitorId)).toEqual([2, 1, 3]);
  });

  it('uses manual order only inside competitors with equal wins and diff', () => {
    const ranked = rankCompetitors(
      [
        { competitorId: 1, wins: 3, diff: 8 },
        { competitorId: 2, wins: 1, diff: -1 },
        { competitorId: 3, wins: 1, diff: -1 },
        { competitorId: 4, wins: 1, diff: -6 },
      ],
      [3, 2],
    );

    expect(ranked.map((item) => item.competitorId)).toEqual([1, 3, 2, 4]);
  });

  it('detects ties that affect advancement places', () => {
    const tied = findTieForPlaces(
      [
        { competitorId: 1, wins: 2, diff: 5 },
        { competitorId: 2, wins: 1, diff: 1 },
        { competitorId: 3, wins: 1, diff: 1 },
      ],
      2,
    );

    expect(tied).toEqual([2, 3]);
  });

  it('seeds Olympic slots to separate teammates as long as possible', () => {
    const seeded = seedOlympicSlots([
      competitor(1, 1, 10),
      competitor(2, 1, 10),
      competitor(3, 2, 20),
      competitor(4, 2, 20),
    ]);

    const firstClubSlots = seeded
      .map((item, index) => ({ item, slot: index + 1 }))
      .filter(({ item }) => item.fighter.club_id === 10)
      .map(({ slot }) => slot);

    expect(Math.abs(firstClubSlots[0] - firstClubSlots[1])).toBeGreaterThan(1);
  });
});
