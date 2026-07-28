import type { GroupInput, SeedCompetitor } from './domain-types';

export const getGroupLetter = (index: number) =>
  String.fromCharCode(65 + index);

export const shuffleStable = <T extends SeedCompetitor>(competitors: T[]) =>
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
