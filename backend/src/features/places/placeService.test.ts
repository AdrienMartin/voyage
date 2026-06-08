import { describe, expect, it } from "vitest";
import {
  canSearchVisitPlacesForCircuit,
  formatVisitPlaceResponse,
  normalizeCircuitVisitPlaceSearchParams,
} from "./placeService.js";

describe("canSearchVisitPlacesForCircuit", () => {
  it("requires at least two circuit points", () => {
    expect(canSearchVisitPlacesForCircuit([])).toBe(false);
    expect(
      canSearchVisitPlacesForCircuit([
        {
          latitude: 47.2184,
          longitude: -1.5536,
        },
      ]),
    ).toBe(false);
    expect(
      canSearchVisitPlacesForCircuit([
        {
          latitude: 47.2184,
          longitude: -1.5536,
        },
        {
          latitude: 48.8566,
          longitude: 2.3522,
        },
      ]),
    ).toBe(true);
  });
});

describe("normalizeCircuitVisitPlaceSearchParams", () => {
  it("applies defaults while preserving point order", () => {
    expect(
      normalizeCircuitVisitPlaceSearchParams({
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
      }),
    ).toEqual({
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
      proximityRadiusMeters: 10_000,
      limit: 100,
    });
  });
});

describe("formatVisitPlaceResponse", () => {
  it("rounds distance and preserves useful place fields", () => {
    expect(
      formatVisitPlaceResponse([
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
      ]),
    ).toEqual({
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
});
