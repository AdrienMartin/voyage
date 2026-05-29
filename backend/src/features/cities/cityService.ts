import type {
  AdministrativeCitySearchParams,
  CityRow,
  CitySearchParams,
} from "./cityTypes.js";
import { DEFAULT_CITY_LIMIT } from "./cityConstants.js";

export function normalizeCitySearchParams(input: {
  lat: number;
  lon: number;
  radius: number;
  limit?: number;
}): CitySearchParams {
  return {
    lat: input.lat,
    lon: input.lon,
    radius: input.radius,
    limit: input.limit ?? DEFAULT_CITY_LIMIT,
  };
}

export function formatCityResponse(cities: CityRow[]) {
  return {
    total: cities.length,
    cities: cities.map((city) => ({
      inseeCode: city.inseeCode,
      name: city.name,
      postalCodes: city.postalCodes,
      population: city.population,
      latitude: city.latitude,
      longitude: city.longitude,
      distanceMeters: Math.round(city.distanceMeters),
    })),
  };
}

export function normalizeAdministrativeCitySearchParams(input: {
  departmentCodes?: string;
  regionCodes?: string;
  limit?: number;
}): AdministrativeCitySearchParams {
  return {
    departmentCodes: normalizeCodeList(input.departmentCodes),
    regionCodes: normalizeCodeList(input.regionCodes),
    limit: input.limit ?? DEFAULT_CITY_LIMIT,
  };
}

function normalizeCodeList(value?: string) {
  if (value === undefined) {
    return [];
  }

  return [...new Set(value.split(",").map((code) => code.trim()).filter(Boolean))];
}
