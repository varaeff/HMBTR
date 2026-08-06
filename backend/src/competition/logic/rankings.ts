import type { RankedCompetitor } from './domain-types';

export const rankCompetitors = (
  competitors: RankedCompetitor[],
  manualOrder: number[] = [],
) => {
  const manualPlace = new Map(
    manualOrder.map((competitorId, index) => [competitorId, index]),
  );

  return [...competitors].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if ((a.activeYellowCount ?? 0) !== (b.activeYellowCount ?? 0)) {
      return (a.activeYellowCount ?? 0) - (b.activeYellowCount ?? 0);
    }
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
        candidate.wins === current.wins &&
        (candidate.activeYellowCount ?? 0) ===
          (current.activeYellowCount ?? 0) &&
        candidate.diff === current.diff,
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
