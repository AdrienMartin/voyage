import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import type { CityRepository } from "../cities/cityRepository.js";
import type { VisitPlaceRepository } from "./placeRepository.js";

function createFakeCityRepository(): CityRepository {
  return {
    async findCitiesWithinRadius() {
      return [];
    },
    async findCitiesByAdministrativeAreas() {
      return [];
    },
    async close() {},
  };
}

function createFakeVisitPlaceRepository(): VisitPlaceRepository {
  return {
    async findPlacesNearCircuit() {
      return [
        {
          source: "DATAtourisme",
          sourceId: "place-1",
          name: "Chateau de test",
          category: "Castle",
          subCategory: null,
          description: "Description utile",
          commune: "Tours",
          latitude: 47.39,
          longitude: 0.69,
          imageUrl: "https://example.test/image.jpg",
          websiteUrl: "https://example.test/place",
          rankingScore: 52,
          distanceToCircuitMeters: 1249.6,
        },
      ];
    },
    async close() {},
  };
}

const app = buildApp({
  cityRepository: createFakeCityRepository(),
  visitPlaceRepository: createFakeVisitPlaceRepository(),
});

afterAll(async () => {
  await app.close();
});

describe("POST /circuit/places", () => {
  it("returns visit places for a valid circuit", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/circuit/places",
      payload: {
        circuitPoints: [
          {
            latitude: 47.2184,
            longitude: -1.5536,
          },
          {
            latitude: 48.8566,
            longitude: 2.3522,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 1,
      places: [
        {
          source: "DATAtourisme",
          sourceId: "place-1",
          name: "Chateau de test",
          category: "Castle",
          subCategory: null,
          description: "Description utile",
          commune: "Tours",
          latitude: 47.39,
          longitude: 0.69,
          imageUrl: "https://example.test/image.jpg",
          websiteUrl: "https://example.test/place",
          rankingScore: 52,
          distanceToCircuitMeters: 1250,
        },
      ],
    });
  });

  it("rejects an empty circuit", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/circuit/places",
      payload: {
        circuitPoints: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "INVALID_QUERY",
      message: "body/circuitPoints must NOT have fewer than 2 items",
    });
  });

  it("rejects a circuit with only one point", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/circuit/places",
      payload: {
        circuitPoints: [
          {
            latitude: 47.2184,
            longitude: -1.5536,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid coordinates", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/circuit/places",
      payload: {
        circuitPoints: [
          {
            latitude: 120,
            longitude: -1.5536,
          },
          {
            latitude: 48.8566,
            longitude: 2.3522,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
