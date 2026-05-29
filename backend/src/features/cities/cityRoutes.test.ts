import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import type { CityRepository } from "./cityRepository.js";

function createFakeCityRepository(): CityRepository {
  return {
    async findCitiesWithinRadius() {
      return [
        {
          inseeCode: "44109",
          name: "Nantes",
          postalCodes: ["44000", "44100"],
          population: 323204,
          latitude: 47.2184,
          longitude: -1.5536,
          distanceMeters: 42123.4,
        },
      ];
    },
    async findCitiesByAdministrativeAreas() {
      return [
        {
          inseeCode: "75056",
          name: "Paris",
          postalCodes: ["75001"],
          population: 2103778,
          latitude: 48.8566,
          longitude: 2.3522,
          distanceMeters: 0,
        },
      ];
    },
    async close() {},
  };
}

const app = buildApp({
  cityRepository: createFakeCityRepository(),
});

afterAll(async () => {
  await app.close();
});

describe("GET /cities", () => {
  it("returns cities with formatted payload", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/cities?lat=47.21&lon=-1.55&radius=50000",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 1,
      cities: [
        {
          inseeCode: "44109",
          name: "Nantes",
          postalCodes: ["44000", "44100"],
          population: 323204,
          latitude: 47.2184,
          longitude: -1.5536,
          distanceMeters: 42123,
        },
      ],
    });
  });

  it("rejects invalid radius values", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/cities?lat=47.21&lon=-1.55&radius=10",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "INVALID_QUERY",
      message: "querystring/radius must be >= 1000",
    });
  });

  it("rejects radius values that are too large", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/cities?lat=47.21&lon=-1.55&radius=400000",
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid latitude values", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/cities?lat=120&lon=-1.55&radius=50000",
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("GET /cities/administrative", () => {
  it("returns cities for administrative selections", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/cities/administrative?regionCodes=11",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 1,
      cities: [
        {
          inseeCode: "75056",
          name: "Paris",
          postalCodes: ["75001"],
          population: 2103778,
          latitude: 48.8566,
          longitude: 2.3522,
          distanceMeters: 0,
        },
      ],
    });
  });

  it("rejects an empty administrative query", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/cities/administrative",
    });

    expect(response.statusCode).toBe(400);
  });
});
