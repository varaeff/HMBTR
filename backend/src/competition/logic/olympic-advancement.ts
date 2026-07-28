import type { OlympicAdvancer, RankedGroup } from './domain-types';
import { getNextOlympicBracketSize } from './olympic-seeding';

const getManualPlace = (manualOrder: number[]) =>
  new Map(manualOrder.map((competitorId, index) => [competitorId, index]));

const compareThirdPlaces = (
  manualPlace: Map<number, number>,
  a: OlympicAdvancer,
  b: OlympicAdvancer,
) => {
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

  if (a.groupName !== b.groupName) {
    return a.groupName.localeCompare(b.groupName);
  }
  return a.competitorId - b.competitorId;
};

export const getOlympicThirdPlaceShortfall = (groups: RankedGroup[]) => {
  const primaryAdvancerCount = groups.flatMap((group) =>
    group.ranked.slice(0, 2),
  ).length;
  const targetSize = getNextOlympicBracketSize(primaryAdvancerCount);

  if (!targetSize || targetSize === primaryAdvancerCount) return 0;

  return targetSize - primaryAdvancerCount;
};

const getThirdPlaceCandidates = (groups: RankedGroup[]) =>
  groups
    .map((group) => {
      const competitor = group.ranked[2];
      return competitor
        ? { ...competitor, groupName: group.name, groupPlace: 3 }
        : null;
    })
    .filter((competitor): competitor is OlympicAdvancer => Boolean(competitor));

export const findThirdPlaceAdvancementTie = (
  groups: RankedGroup[],
  manualOrder: number[] = [],
) => {
  const shortfall = getOlympicThirdPlaceShortfall(groups);
  if (shortfall <= 0) return [];

  const thirdPlaces = getThirdPlaceCandidates(groups);
  if (thirdPlaces.length < shortfall) return [];

  const manualPlace = getManualPlace(manualOrder);
  const sortedThirdPlaces = [...thirdPlaces].sort((a, b) =>
    compareThirdPlaces(manualPlace, a, b),
  );
  const boundary = sortedThirdPlaces[shortfall - 1];
  if (!boundary) return [];

  const tiedAtBoundary = sortedThirdPlaces.filter(
    (competitor) =>
      competitor.wins === boundary.wins && competitor.diff === boundary.diff,
  );
  const crossesBoundary =
    tiedAtBoundary.some((competitor) =>
      sortedThirdPlaces
        .slice(0, shortfall)
        .some((selected) => selected.competitorId === competitor.competitorId),
    ) &&
    tiedAtBoundary.some((competitor) =>
      sortedThirdPlaces
        .slice(shortfall)
        .some((excluded) => excluded.competitorId === competitor.competitorId),
    );

  if (!crossesBoundary) return [];
  if (
    tiedAtBoundary.every((competitor) =>
      manualOrder.includes(competitor.competitorId),
    )
  ) {
    return [];
  }

  return tiedAtBoundary.map((competitor) => competitor.competitorId);
};

export const selectOlympicAdvancers = (
  groups: RankedGroup[],
  includeThirdPlaces = false,
  thirdPlaceManualOrder: number[] = [],
) => {
  const primaryAdvancers = groups.flatMap((group) =>
    group.ranked.slice(0, 2).map((competitor, index) => ({
      ...competitor,
      groupName: group.name,
      groupPlace: index + 1,
    })),
  );

  if (!includeThirdPlaces) return primaryAdvancers;

  const targetSize = getNextOlympicBracketSize(primaryAdvancers.length);
  if (!targetSize || targetSize === primaryAdvancers.length) {
    return primaryAdvancers;
  }

  const shortfall = targetSize - primaryAdvancers.length;
  const thirdPlaces = getThirdPlaceCandidates(groups);

  if (thirdPlaces.length < shortfall) return primaryAdvancers;

  const manualPlace = getManualPlace(thirdPlaceManualOrder);
  const additionalAdvancers = [...thirdPlaces]
    .sort((a, b) => compareThirdPlaces(manualPlace, a, b))
    .slice(0, shortfall)
    .map((competitor) => competitor);

  return [...primaryAdvancers, ...additionalAdvancers];
};

export const selectOlympicAdvancerIds = (
  groups: RankedGroup[],
  includeThirdPlaces = false,
) =>
  selectOlympicAdvancers(groups, includeThirdPlaces).map(
    (advancer) => advancer.competitorId,
  );
