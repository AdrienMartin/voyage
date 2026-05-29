import { describe, expect, it } from "vitest";
import {
  formatCityResponse,
  normalizeAdministrativeCitySearchParams,
  normalizeCitySearchParams,
} from "./cityService.js";

describe("normalizeCitySearchParams", () => {
  it("applies the default limit", () => {
    expect(
      normalizeCitySearchParams({
        lat: 48.8566,
        lon: 2.3522,
        radius: 50000,
      }),
    ).toEqual({
      lat: 48.8566,
      lon: 2.3522,
      radius: 50000,
      limit: 50,
    });
  });
});

describe("formatCityResponse", () => {
  it("rounds distance and preserves useful city fields", () => {
    expect(
      formatCityResponse([
        {
          inseeCode: "75056",
          name: "Paris",
          postalCodes: ["75001", "75002"],
          population: 2102650,
          latitude: 48.8566,
          longitude: 2.3522,
          distanceMeters: 1234.8,
        },
      ]),
    ).toEqual({
      total: 1,
      cities: [
        {
          inseeCode: "75056",
          name: "Paris",
          postalCodes: ["75001", "75002"],
          population: 2102650,
          latitude: 48.8566,
          longitude: 2.3522,
          distanceMeters: 1235,
        },
      ],
    });
  });
});

describe("normalizeAdministrativeCitySearchParams", () => {
  it("deduplicates and trims codes while applying the default limit", () => {
    expect(
      normalizeAdministrativeCitySearchParams({
        departmentCodes: "75, 92,75, 93 ",
        regionCodes: "11, 11",
      }),
    ).toEqual({
      departmentCodes: ["75", "92", "93"],
      regionCodes: ["11"],
      limit: 50,
    });
  });
});
