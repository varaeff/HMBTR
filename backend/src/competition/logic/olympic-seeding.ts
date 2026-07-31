import type { OlympicSeedCompetitor, SeedCompetitor } from './domain-types';
import { shuffleStable } from './group-generation';

export const OLYMPIC_BRACKET_SIZES = [4, 8, 16] as const;

export const getNextOlympicBracketSize = (competitorCount: number) =>
  OLYMPIC_BRACKET_SIZES.find((size) => size >= competitorCount) ?? null;

const scoreSeedPlacement = <T extends SeedCompetitor>(
  candidate: T,
  slotIndex: number,
  slots: Array<T | null>,
) => {
  const halfSize = Math.max(1, slots.length / 2);
  const quarterSize = Math.max(1, slots.length / 4);
  const candidateClub = candidate.fighter?.club_id;
  const candidateCity = candidate.fighter?.city_id;
  let score = 0;

  slots.forEach((slot, index) => {
    if (!slot) return;
    const sameHalf =
      Math.floor(index / halfSize) === Math.floor(slotIndex / halfSize);
    const sameQuarter =
      Math.floor(index / quarterSize) === Math.floor(slotIndex / quarterSize);
    const sameClub = candidateClub && candidateClub === slot.fighter?.club_id;
    const sameCity = candidateCity && candidateCity === slot.fighter?.city_id;

    if (sameClub && sameHalf) score += 100;
    if (sameClub && sameQuarter) score += 40;
    if (sameCity && sameHalf) score += 20;
    if (sameCity && sameQuarter) score += 8;
  });

  return score;
};

export const seedOlympicSlots = <T extends SeedCompetitor>(
  competitors: T[],
): T[] => {
  const remaining = shuffleStable(competitors);
  const slots: Array<T | null> = Array.from(
    { length: remaining.length },
    () => null,
  );

  while (remaining.length) {
    const competitor = remaining.shift()!;
    const bestSlot = slots
      .map((slot, index) => ({
        index,
        available: slot === null,
        score:
          slot === null
            ? scoreSeedPlacement(competitor, index, slots)
            : Number.POSITIVE_INFINITY,
      }))
      .filter((slot) => slot.available)
      .sort((a, b) =>
        a.score === b.score ? a.index - b.index : a.score - b.score,
      )[0];

    slots[bestSlot.index] = competitor;
  }

  return slots.filter((slot): slot is T => slot !== null);
};

const compareOlympicSeeds = (
  a: OlympicSeedCompetitor,
  b: OlympicSeedCompetitor,
) => {
  const groupComparison = (a.olympicGroupName ?? '').localeCompare(
    b.olympicGroupName ?? '',
  );
  if (groupComparison !== 0) return groupComparison;
  const placeComparison =
    (a.olympicGroupPlace ?? Number.POSITIVE_INFINITY) -
    (b.olympicGroupPlace ?? Number.POSITIVE_INFINITY);
  return placeComparison || a.id - b.id;
};

const pairPenalty = (a: OlympicSeedCompetitor, b: OlympicSeedCompetitor) => ({
  sameGroup:
    a.olympicGroupName === b.olympicGroupName &&
    a.olympicGroupName !== undefined
      ? 1
      : 0,
  firstVsFirst: a.olympicGroupPlace === 1 && b.olympicGroupPlace === 1 ? 1 : 0,
});

const findBestRemainingPairs = <T extends OlympicSeedCompetitor>(
  competitors: T[],
): T[][] => {
  let best:
    | {
        pairs: T[][];
        sameGroup: number;
        firstVsFirst: number;
        key: string;
      }
    | undefined;

  const visit = (
    remaining: T[],
    pairs: T[][],
    sameGroup: number,
    firstVsFirst: number,
  ) => {
    if (!remaining.length) {
      const orderedPairs = pairs
        .map((pair) => [...pair].sort(compareOlympicSeeds))
        .sort((a, b) => compareOlympicSeeds(a[0], b[0]));
      const key = orderedPairs
        .flat()
        .map(
          (competitor) =>
            `${competitor.olympicGroupName ?? ''}:${competitor.olympicGroupPlace ?? ''}:${competitor.id}`,
        )
        .join('|');
      if (
        !best ||
        sameGroup < best.sameGroup ||
        (sameGroup === best.sameGroup && firstVsFirst < best.firstVsFirst) ||
        (sameGroup === best.sameGroup &&
          firstVsFirst === best.firstVsFirst &&
          key < best.key)
      ) {
        best = { pairs: orderedPairs, sameGroup, firstVsFirst, key };
      }
      return;
    }

    if (
      best &&
      (sameGroup > best.sameGroup ||
        (sameGroup === best.sameGroup && firstVsFirst > best.firstVsFirst))
    ) {
      return;
    }

    const [first, ...rest] = remaining;
    for (const [index, opponent] of rest.entries()) {
      const penalty = pairPenalty(first, opponent);
      visit(
        rest.filter((_, restIndex) => restIndex !== index),
        [...pairs, [first, opponent]],
        sameGroup + penalty.sameGroup,
        firstVsFirst + penalty.firstVsFirst,
      );
    }
  };

  visit([...competitors].sort(compareOlympicSeeds), [], 0, 0);
  return best?.pairs ?? [];
};

export const seedGroupDerivedOlympicSlots = <T extends OlympicSeedCompetitor>(
  competitors: T[],
): T[] => {
  const ordered = [...competitors].sort(compareOlympicSeeds);
  const groupNames = [
    ...new Set(ordered.map((competitor) => competitor.olympicGroupName)),
  ].filter((groupName): groupName is string => groupName !== undefined);
  const thirdPlaces = competitors.filter(
    (competitor) => competitor.olympicGroupPlace === 3,
  );

  if (!thirdPlaces.length) {
    const cyclicPairs = groupNames.flatMap((groupName, index) => {
      const nextGroupName = groupNames[(index + 1) % groupNames.length];
      const first = ordered.find(
        (competitor) =>
          competitor.olympicGroupName === groupName &&
          competitor.olympicGroupPlace === 1,
      );
      const second = ordered.find(
        (competitor) =>
          competitor.olympicGroupName === nextGroupName &&
          competitor.olympicGroupPlace === 2,
      );
      return first && second ? [first, second] : [];
    });
    if (cyclicPairs.length === ordered.length) return cyclicPairs;
  }

  const remaining = [...ordered];
  const thirdPlacePairs: T[][] = [];
  for (const thirdPlace of thirdPlaces) {
    const availableFirstPlaces = remaining
      .filter(
        (competitor) =>
          competitor.olympicGroupPlace === 1 &&
          competitor.olympicGroupName !== thirdPlace.olympicGroupName,
      )
      .sort(compareOlympicSeeds);
    const opponent = availableFirstPlaces[0];
    if (!opponent) continue;

    thirdPlacePairs.push([opponent, thirdPlace]);
    for (const competitor of [opponent, thirdPlace]) {
      const index = remaining.findIndex((item) => item.id === competitor.id);
      if (index !== -1) remaining.splice(index, 1);
    }
  }

  return [...thirdPlacePairs, ...findBestRemainingPairs(remaining)].flat();
};

export const seedOlympicSlotsWithThirdPlacePairing =
  seedGroupDerivedOlympicSlots;
