import { describe, expect, it } from "vitest";
import {
  getMinimumRankingScoreForZoom,
  isRenderableVisitPlace,
  selectDisplayedVisitPlaces,
} from "./placeDisplay";
import type { MapBounds } from "../cities/cityDisplay";
import type { VisitPlace } from "../../types/places";

const bounds: MapBounds = {
  west: -2,
  south: 47.0,
  east: 1.2,
  north: 48.2,
};

const visitPlaces: VisitPlace[] = [
  {
    source: "DATAtourisme",
    sourceId: "a",
    name: "Chateau premium",
    category: "Castle",
    subCategory: null,
    description: null,
    commune: "Tours",
    latitude: 47.39,
    longitude: 0.68,
    imageUrl: null,
    websiteUrl: null,
    rankingScore: 52,
    distanceToCircuitMeters: 200,
  },
  {
    source: "DATAtourisme",
    sourceId: "b",
    name: "Musee central",
    category: "Museum",
    subCategory: null,
    description: null,
    commune: "Tours",
    latitude: 47.4,
    longitude: 0.69,
    imageUrl: null,
    websiteUrl: null,
    rankingScore: 46,
    distanceToCircuitMeters: 250,
  },
  {
    source: "DATAtourisme",
    sourceId: "c",
    name: "Lieu secondaire",
    category: "Local Business",
    subCategory: "Museum",
    description: null,
    commune: "Tours",
    latitude: 47.41,
    longitude: 0.7,
    imageUrl: null,
    websiteUrl: null,
    rankingScore: 34,
    distanceToCircuitMeters: 300,
  },
  {
    source: "DATAtourisme",
    sourceId: "d",
    name: "Hors vue",
    category: "Castle",
    subCategory: null,
    description: null,
    commune: "Nantes",
    latitude: 46.0,
    longitude: -1.5,
    imageUrl: null,
    websiteUrl: null,
    rankingScore: 52,
    distanceToCircuitMeters: 400,
  },
];

describe("getMinimumRankingScoreForZoom", () => {
  it("decreases smoothly as the user zooms in", () => {
    expect(getMinimumRankingScoreForZoom(4.8)).toBeGreaterThan(
      getMinimumRankingScoreForZoom(5.8),
    );
    expect(getMinimumRankingScoreForZoom(5.8)).toBeGreaterThan(
      getMinimumRankingScoreForZoom(6.8),
    );
    expect(getMinimumRankingScoreForZoom(9.5)).toBe(0);
  });
});

describe("selectDisplayedVisitPlaces", () => {
  it("shows only the strongest places when zoomed out", () => {
    expect(
      selectDisplayedVisitPlaces(visitPlaces, bounds, 5.0).map((place) => place.name),
    ).toEqual(["Chateau premium", "Musee central"]);
  });

  it("shows more places as the user zooms in", () => {
    expect(
      selectDisplayedVisitPlaces(visitPlaces, bounds, 8.2).map((place) => place.name),
    ).toEqual(["Chateau premium", "Musee central", "Lieu secondaire"]);
  });

  it("keeps only places inside the current viewport", () => {
    expect(
      selectDisplayedVisitPlaces(visitPlaces, bounds, 9.5).map((place) => place.name),
    ).not.toContain("Hors vue");
  });

  it("ignores places with invalid or out-of-france coordinates", () => {
    const displayedPlaces = selectDisplayedVisitPlaces(
      [
        ...visitPlaces,
        {
          ...visitPlaces[0],
          sourceId: "invalid",
          latitude: Number.NaN,
        },
        {
          ...visitPlaces[0],
          sourceId: "off-france",
          latitude: 0,
          longitude: 0,
        },
      ],
      null,
      9.5,
    );

    expect(displayedPlaces.map((place) => place.sourceId)).not.toContain("invalid");
    expect(displayedPlaces.map((place) => place.sourceId)).not.toContain("off-france");
  });
});

describe("isRenderableVisitPlace", () => {
  it("returns true for a metropolitan place with finite coordinates", () => {
    expect(isRenderableVisitPlace(visitPlaces[0]!)).toBe(true);
  });

  it("returns false for invalid or non metropolitan coordinates", () => {
    expect(
      isRenderableVisitPlace({
        ...visitPlaces[0]!,
        latitude: Number.NaN,
      }),
    ).toBe(false);
    expect(
      isRenderableVisitPlace({
        ...visitPlaces[0]!,
        latitude: 0,
        longitude: 0,
      }),
    ).toBe(false);
  });
});
