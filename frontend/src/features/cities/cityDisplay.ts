import type { City } from "../../types/cities";

const MIN_CITY_ZOOM_LEVEL = 4.5;
const FULL_CITY_ZOOM_LEVEL = 9.5;
const MAX_MINIMUM_POPULATION = 180_000;

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function selectDisplayedCities(
  cities: City[],
  bounds: MapBounds | null,
  zoomLevel: number,
) {
  const citiesInView = bounds === null ? cities : cities.filter((city) => isCityInsideBounds(city, bounds));
  const minimumPopulation = getMinimumPopulationForZoom(zoomLevel);
  const maxVisibleCities = getMaximumVisibleCitiesForZoom(zoomLevel);
  const prioritizedCities = citiesInView.filter((city) => city.population >= minimumPopulation);

  if (prioritizedCities.length >= maxVisibleCities) {
    return prioritizedCities.slice(0, maxVisibleCities);
  }

  if (minimumPopulation === 0) {
    return [...prioritizedCities, ...citiesInView.filter((city) => city.population < minimumPopulation)]
      .slice(0, maxVisibleCities);
  }

  if (prioritizedCities.length > 0) {
    return prioritizedCities;
  }

  return citiesInView.slice(0, getFallbackCityCountForZoom(zoomLevel));
}

export function getMinimumPopulationForZoom(zoomLevel: number) {
  const zoomProgress = clamp01(
    (zoomLevel - MIN_CITY_ZOOM_LEVEL) / (FULL_CITY_ZOOM_LEVEL - MIN_CITY_ZOOM_LEVEL),
  );

  if (zoomProgress >= 1) {
    return 0;
  }

  // Courbe douce: très sélective dézoomé, puis ouverture progressive.
  return Math.round(MAX_MINIMUM_POPULATION * Math.pow(1 - zoomProgress, 2.4));
}

function isCityInsideBounds(city: City, bounds: MapBounds) {
  return (
    city.latitude >= bounds.south &&
    city.latitude <= bounds.north &&
    city.longitude >= bounds.west &&
    city.longitude <= bounds.east
  );
}

function getFallbackCityCountForZoom(zoomLevel: number) {
  if (zoomLevel < 6) {
    return 6;
  }

  if (zoomLevel < 8) {
    return 10;
  }

  return 15;
}

function getMaximumVisibleCitiesForZoom(zoomLevel: number) {
  const zoomProgress = clamp01(
    (zoomLevel - MIN_CITY_ZOOM_LEVEL) / (FULL_CITY_ZOOM_LEVEL - MIN_CITY_ZOOM_LEVEL),
  );

  return Math.round(4 + (140 - 4) * Math.pow(zoomProgress, 1.35));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
