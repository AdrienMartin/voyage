import type { VisitPlace } from "../../types/places";
import { isPointInMetropolitanFrance } from "../../lib/geo";
import type { MapBounds } from "../cities/cityDisplay";

const MIN_PLACE_ZOOM_LEVEL = 4.5;
const FULL_PLACE_ZOOM_LEVEL = 9.5;
const MAX_MINIMUM_RANKING_SCORE = 44;

export function selectDisplayedVisitPlaces(
  visitPlaces: VisitPlace[],
  bounds: MapBounds | null,
  zoomLevel: number,
) {
  const safeVisitPlaces = visitPlaces.filter(isRenderableVisitPlace);
  const placesInView =
    bounds === null
      ? safeVisitPlaces
      : safeVisitPlaces.filter((place) => isPlaceInsideBounds(place, bounds));
  const minimumRankingScore = getMinimumRankingScoreForZoom(zoomLevel);
  const maxVisiblePlaces = getMaximumVisiblePlacesForZoom(zoomLevel);
  const prioritizedPlaces = placesInView.filter(
    (place) => place.rankingScore >= minimumRankingScore,
  );

  if (prioritizedPlaces.length >= maxVisiblePlaces) {
    return prioritizedPlaces.slice(0, maxVisiblePlaces);
  }

  if (minimumRankingScore <= 0) {
    return placesInView.slice(0, maxVisiblePlaces);
  }

  if (prioritizedPlaces.length > 0) {
    return prioritizedPlaces;
  }

  return placesInView.slice(0, getFallbackPlaceCountForZoom(zoomLevel));
}

export function getMinimumRankingScoreForZoom(zoomLevel: number) {
  const zoomProgress = clamp01(
    (zoomLevel - MIN_PLACE_ZOOM_LEVEL) / (FULL_PLACE_ZOOM_LEVEL - MIN_PLACE_ZOOM_LEVEL),
  );

  if (zoomProgress >= 1) {
    return 0;
  }

  return Math.round(MAX_MINIMUM_RANKING_SCORE * Math.pow(1 - zoomProgress, 2.1));
}

function getMaximumVisiblePlacesForZoom(zoomLevel: number) {
  const zoomProgress = clamp01(
    (zoomLevel - MIN_PLACE_ZOOM_LEVEL) / (FULL_PLACE_ZOOM_LEVEL - MIN_PLACE_ZOOM_LEVEL),
  );

  return Math.round(8 + (28 - 8) * Math.pow(zoomProgress, 1.25));
}

function getFallbackPlaceCountForZoom(zoomLevel: number) {
  if (zoomLevel < 6) {
    return 6;
  }

  if (zoomLevel < 8) {
    return 10;
  }

  return 14;
}

function isPlaceInsideBounds(place: VisitPlace, bounds: MapBounds) {
  return (
    place.latitude >= bounds.south &&
    place.latitude <= bounds.north &&
    place.longitude >= bounds.west &&
    place.longitude <= bounds.east
  );
}

export function isRenderableVisitPlace(place: VisitPlace) {
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    return false;
  }

  return isPointInMetropolitanFrance({
    lat: place.latitude,
    lon: place.longitude,
  });
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
