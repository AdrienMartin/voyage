import type { CitySearchResponse } from "../types/cities";
import type { SelectedPoint } from "../types/geo";

const API_BASE_URL = "http://localhost:3000";
const FULL_CITY_FETCH_LIMIT = "40000";

export async function fetchCities(params: {
  point: SelectedPoint;
  radiusInMeters: number;
  signal?: AbortSignal;
}): Promise<CitySearchResponse> {
  const searchParams = new URLSearchParams({
    lat: String(params.point.lat),
    lon: String(params.point.lon),
    radius: String(params.radiusInMeters),
    limit: FULL_CITY_FETCH_LIMIT,
  });

  const response = await fetch(`${API_BASE_URL}/cities?${searchParams.toString()}`, {
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error(`City search failed with status ${response.status}.`);
  }

  return (await response.json()) as CitySearchResponse;
}

export async function fetchCitiesByAdministrativeAreas(params: {
  departmentCodes?: string[];
  regionCodes?: string[];
  signal?: AbortSignal;
}): Promise<CitySearchResponse> {
  const searchParams = new URLSearchParams({
    limit: FULL_CITY_FETCH_LIMIT,
  });

  if ((params.departmentCodes?.length ?? 0) > 0) {
    searchParams.set("departmentCodes", params.departmentCodes!.join(","));
  }

  if ((params.regionCodes?.length ?? 0) > 0) {
    searchParams.set("regionCodes", params.regionCodes!.join(","));
  }

  const response = await fetch(
    `${API_BASE_URL}/cities/administrative?${searchParams.toString()}`,
    {
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Administrative city search failed with status ${response.status}.`);
  }

  return (await response.json()) as CitySearchResponse;
}
