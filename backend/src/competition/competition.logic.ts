export type RankedCompetitor = {
  competitorId: number;
  wins: number;
  diff: number;
};

export type SeedCompetitor = {
  id: number;
  fighter_id: number;
  fighter?: {
    city_id?: number | null;
    club_id?: number | null;
  } | null;
};

export type GroupInput<T> = {
  name: string;
  competitors: T[];
};

const getGroupLetter = (index: number) => String.fromCharCode(65 + index);

const shuffleStable = <T extends SeedCompetitor>(competitors: T[]) =>
  [...competitors].sort((a, b) => a.id - b.id);

export const generateCompetitionGroups = <T extends SeedCompetitor>(
  competitors: T[],
  startIndex: number,
): GroupInput<T>[] => {
  const ordered = shuffleStable(competitors);
  const total = ordered.length;

  if (total === 0) return [];
  if (total < 4) {
    return [{ name: getGroupLetter(startIndex), competitors: ordered }];
  }

  let groupCount = Math.round(total / 4);
  if (groupCount < 1) groupCount = 1;
  if (groupCount > 16) groupCount = 16;
  if (total / groupCount < 3) groupCount = Math.floor(total / 3);
  if (groupCount > 2 && groupCount % 2 !== 0 && total / (groupCount - 1) <= 6) {
    groupCount--;
  }

  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  const clusters = new Map<string, T[]>();

  for (const competitor of ordered) {
    const clubId = competitor.fighter?.club_id;
    const cityId = competitor.fighter?.city_id;
    const key = clubId ? `club:${clubId}` : `city:${cityId ?? 'none'}`;
    const cluster = clusters.get(key) ?? [];
    cluster.push(competitor);
    clusters.set(key, cluster);
  }

  const flatCompetitors = [...clusters.values()]
    .sort((a, b) => b.length - a.length)
    .flat();

  for (const competitor of flatCompetitors) {
    const bestGroup = groups
      .map((group, index) => ({
        index,
        size: group.length,
        clubCount: group.filter(
          (g) =>
            g.fighter?.club_id &&
            g.fighter.club_id === competitor.fighter?.club_id,
        ).length,
        cityCount: group.filter(
          (g) => g.fighter?.city_id === competitor.fighter?.city_id,
        ).length,
      }))
      .sort((a, b) => {
        if (a.size !== b.size) return a.size - b.size;
        if (a.clubCount !== b.clubCount) return a.clubCount - b.clubCount;
        return a.cityCount - b.cityCount;
      })[0];

    groups[bestGroup.index].push(competitor);
  }

  return groups.map((competitors, index) => ({
    name: getGroupLetter(startIndex + index),
    competitors,
  }));
};

export const generateRoundRobinPairs = <T>(participants: T[]): [T, T][] => {
  const p = [...participants];
  if (p.length < 2) return [];

  const extendedParticipants: (T | null)[] =
    p.length % 2 !== 0 ? [...p, null] : p;
  const pairs: [T, T][] = [];
  const n = extendedParticipants.length;

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const p1 = extendedParticipants[i];
      const p2 = extendedParticipants[n - 1 - i];
      if (p1 !== null && p2 !== null) {
        pairs.push([p1, p2]);
      }
    }

    const shifted = extendedParticipants.splice(1, 1);
    extendedParticipants.push(shifted[0]);
  }

  return pairs;
};

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

export const rankCompetitors = (
  competitors: RankedCompetitor[],
  manualOrder: number[] = [],
) => {
  const manualPlace = new Map(
    manualOrder.map((competitorId, index) => [competitorId, index]),
  );

  return [...competitors].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.diff !== a.diff) return b.diff - a.diff;

    const aManual = manualPlace.get(a.competitorId);
    const bManual = manualPlace.get(b.competitorId);
    if (aManual !== undefined || bManual !== undefined) {
      return (
        (aManual ?? Number.POSITIVE_INFINITY) -
        (bManual ?? Number.POSITIVE_INFINITY)
      );
    }
    return 0;
  });
};

export const findTieForPlaces = (
  ranked: RankedCompetitor[],
  places: number,
) => {
  for (let index = 0; index < Math.min(places, ranked.length); index++) {
    const current = ranked[index];
    const tied = ranked.filter(
      (candidate) =>
        candidate.wins === current.wins && candidate.diff === current.diff,
    );
    const crossesTargetPlace = tied.some((candidate) => {
      const candidateIndex = ranked.findIndex(
        (r) => r.competitorId === candidate.competitorId,
      );
      return candidateIndex >= places;
    });

    if (tied.length > 1 && (index < places || crossesTargetPlace)) {
      return tied.map((candidate) => candidate.competitorId);
    }
  }

  return [];
};
