import {
  findTieForPlaces,
  findThirdPlaceAdvancementTie,
  generateCompetitionGroups,
  getNextOlympicBracketSize,
  rankCompetitors,
  selectOlympicAdvancers,
  selectOlympicAdvancerIds,
  seedOlympicSlotsWithThirdPlacePairing,
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

  it('finds the next supported Olympic bracket size', () => {
    expect(getNextOlympicBracketSize(6)).toBe(8);
    expect(getNextOlympicBracketSize(8)).toBe(8);
    expect(getNextOlympicBracketSize(18)).toBeNull();
  });

  it('adds the best third places when they fill the Olympic bracket shortfall', () => {
    const advancers = selectOlympicAdvancerIds(
      [
        {
          name: 'A',
          ranked: [
            { competitorId: 1, wins: 2, diff: 8 },
            { competitorId: 2, wins: 1, diff: 1 },
            { competitorId: 3, wins: 1, diff: -1 },
          ],
        },
        {
          name: 'B',
          ranked: [
            { competitorId: 4, wins: 2, diff: 7 },
            { competitorId: 5, wins: 1, diff: 2 },
            { competitorId: 6, wins: 0, diff: -5 },
          ],
        },
        {
          name: 'C',
          ranked: [
            { competitorId: 7, wins: 2, diff: 6 },
            { competitorId: 8, wins: 1, diff: 0 },
            { competitorId: 9, wins: 1, diff: 3 },
          ],
        },
      ],
      true,
    );

    expect(advancers).toEqual([1, 2, 4, 5, 7, 8, 9, 3]);
  });

  it('does not add third places when they cannot fill the full shortfall', () => {
    const advancers = selectOlympicAdvancerIds(
      [
        {
          name: 'A',
          ranked: [
            { competitorId: 1, wins: 2, diff: 8 },
            { competitorId: 2, wins: 1, diff: 1 },
            { competitorId: 3, wins: 0, diff: -9 },
          ],
        },
        {
          name: 'B',
          ranked: [
            { competitorId: 4, wins: 2, diff: 7 },
            { competitorId: 5, wins: 1, diff: 2 },
            { competitorId: 6, wins: 0, diff: -5 },
          ],
        },
        {
          name: 'C',
          ranked: [
            { competitorId: 7, wins: 2, diff: 6 },
            { competitorId: 8, wins: 1, diff: 0 },
            { competitorId: 9, wins: 0, diff: -2 },
          ],
        },
        {
          name: 'D',
          ranked: [
            { competitorId: 10, wins: 2, diff: 5 },
            { competitorId: 11, wins: 1, diff: -1 },
            { competitorId: 12, wins: 0, diff: -4 },
          ],
        },
        {
          name: 'E',
          ranked: [
            { competitorId: 13, wins: 2, diff: 4 },
            { competitorId: 14, wins: 1, diff: -2 },
            { competitorId: 15, wins: 0, diff: -3 },
          ],
        },
      ],
      true,
    );

    expect(advancers).toEqual([1, 2, 4, 5, 7, 8, 10, 11, 13, 14]);
  });

  it('detects third-place ties crossing the Olympic bracket cutoff', () => {
    const tied = findThirdPlaceAdvancementTie([
      {
        name: 'A',
        ranked: [
          { competitorId: 1, wins: 2, diff: 8 },
          { competitorId: 2, wins: 1, diff: 1 },
          { competitorId: 3, wins: 1, diff: 0 },
        ],
      },
      {
        name: 'B',
        ranked: [
          { competitorId: 4, wins: 2, diff: 7 },
          { competitorId: 5, wins: 1, diff: 2 },
          { competitorId: 6, wins: 1, diff: 0 },
        ],
      },
      {
        name: 'C',
        ranked: [
          { competitorId: 7, wins: 2, diff: 6 },
          { competitorId: 8, wins: 1, diff: 0 },
          { competitorId: 9, wins: 1, diff: 3 },
        ],
      },
    ]);

    expect(tied).toEqual([3, 6]);
  });

  it('uses manual order to choose between tied third places at the Olympic cutoff', () => {
    const advancers = selectOlympicAdvancers(
      [
        {
          name: 'A',
          ranked: [
            { competitorId: 1, wins: 2, diff: 8 },
            { competitorId: 2, wins: 1, diff: 1 },
            { competitorId: 3, wins: 1, diff: 0 },
          ],
        },
        {
          name: 'B',
          ranked: [
            { competitorId: 4, wins: 2, diff: 7 },
            { competitorId: 5, wins: 1, diff: 2 },
            { competitorId: 6, wins: 1, diff: 0 },
          ],
        },
        {
          name: 'C',
          ranked: [
            { competitorId: 7, wins: 2, diff: 6 },
            { competitorId: 8, wins: 1, diff: 0 },
            { competitorId: 9, wins: 1, diff: 3 },
          ],
        },
      ],
      true,
      [6, 3],
    );

    expect(advancers.map((item) => item.competitorId)).toEqual([
      1, 2, 4, 5, 7, 8, 9, 6,
    ]);
  });

  it('pairs selected third places with first places from other groups', () => {
    const seeded = seedOlympicSlotsWithThirdPlacePairing([
      { ...competitor(1, 1), olympicGroupName: 'A', olympicGroupPlace: 1 },
      { ...competitor(2, 1), olympicGroupName: 'A', olympicGroupPlace: 2 },
      { ...competitor(4, 2), olympicGroupName: 'B', olympicGroupPlace: 1 },
      { ...competitor(5, 2), olympicGroupName: 'B', olympicGroupPlace: 2 },
      { ...competitor(7, 3), olympicGroupName: 'C', olympicGroupPlace: 1 },
      { ...competitor(8, 3), olympicGroupName: 'C', olympicGroupPlace: 2 },
      { ...competitor(9, 3), olympicGroupName: 'C', olympicGroupPlace: 3 },
      { ...competitor(3, 1), olympicGroupName: 'A', olympicGroupPlace: 3 },
    ]);

    const firstPair = seeded.slice(0, 2);
    const secondPair = seeded.slice(2, 4);

    expect(firstPair.map((item) => item.olympicGroupPlace).sort()).toEqual([
      1, 3,
    ]);
    expect(secondPair.map((item) => item.olympicGroupPlace).sort()).toEqual([
      1, 3,
    ]);
    expect(firstPair[0].olympicGroupName).not.toBe(
      firstPair[1].olympicGroupName,
    );
    expect(secondPair[0].olympicGroupName).not.toBe(
      secondPair[1].olympicGroupName,
    );
  });
});
