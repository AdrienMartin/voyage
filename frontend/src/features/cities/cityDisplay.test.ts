import { describe, expect, it } from "vitest";
import { getMinimumPopulationForZoom, selectDisplayedCities, type MapBounds } from "./cityDisplay";
import type { City } from "../../types/cities";

const bounds: MapBounds = {
  west: 1.5,
  south: 48.0,
  east: 3.5,
  north: 49.2,
};

const cities: City[] = [
  {
    inseeCode: "75056",
    name: "Paris",
    postalCodes: ["75001"],
    population: 2_100_000,
    latitude: 48.8566,
    longitude: 2.3522,
    distanceMeters: 0,
  },
  {
    inseeCode: "93066",
    name: "Saint-Denis",
    postalCodes: ["93200"],
    population: 149_000,
    latitude: 48.9362,
    longitude: 2.3574,
    distanceMeters: 0,
  },
  {
    inseeCode: "91549",
    name: "Palaiseau",
    postalCodes: ["91120"],
    population: 36_000,
    latitude: 48.7144,
    longitude: 2.2478,
    distanceMeters: 0,
  },
  {
    inseeCode: "78646",
    name: "Rambouillet",
    postalCodes: ["78120"],
    population: 27_000,
    latitude: 48.6437,
    longitude: 1.8299,
    distanceMeters: 0,
  },
  {
    inseeCode: "89024",
    name: "Auxerre",
    postalCodes: ["89000"],
    population: 34_000,
    latitude: 47.7982,
    longitude: 3.5738,
    distanceMeters: 0,
  },
];

describe("getMinimumPopulationForZoom", () => {
  it("decreases smoothly as the user zooms in", () => {
    expect(getMinimumPopulationForZoom(4.8)).toBeGreaterThan(
      getMinimumPopulationForZoom(5.8),
    );
    expect(getMinimumPopulationForZoom(5.8)).toBeGreaterThan(
      getMinimumPopulationForZoom(6.8),
    );
    expect(getMinimumPopulationForZoom(6.8)).toBeGreaterThan(
      getMinimumPopulationForZoom(8.4),
    );
    expect(getMinimumPopulationForZoom(9.5)).toBe(0);
  });
});

describe("selectDisplayedCities", () => {
  it("shows only the largest cities when zoomed out", () => {
    expect(
      selectDisplayedCities(cities, bounds, 5.2).map((city) => city.name),
    ).toEqual(["Paris", "Saint-Denis"]);
  });

  it("does not explode the number of visible cities when fully zoomed out", () => {
    const manyCities = Array.from({ length: 30 }, (_, index) => ({
      inseeCode: `city-${index}`,
      name: `City ${index}`,
      postalCodes: [`75${index.toString().padStart(3, "0")}`],
      population: 400_000 - index * 5_000,
      latitude: 48.2 + index * 0.01,
      longitude: 2 + index * 0.01,
      distanceMeters: 0,
    }));

    expect(selectDisplayedCities(manyCities, {
      west: 1.5,
      south: 48.0,
      east: 3.5,
      north: 49.2,
    }, 4.5)).toHaveLength(4);
  });

  it("shows smaller cities as the user zooms in", () => {
    expect(
      selectDisplayedCities(cities, bounds, 7.6).map((city) => city.name),
    ).toEqual(["Paris", "Saint-Denis", "Palaiseau", "Rambouillet"]);
  });

  it("shows every city in the viewport at high zoom", () => {
    expect(
      selectDisplayedCities(cities, bounds, 9.5).map((city) => city.name),
    ).toEqual(["Paris", "Saint-Denis", "Palaiseau", "Rambouillet"]);
  });

  it("falls back to the biggest visible cities when the threshold would hide everything", () => {
    expect(
      selectDisplayedCities([cities[4]], {
        west: 3.4,
        south: 47.6,
        east: 3.7,
        north: 47.9,
      }, 5.2).map((city) => city.name),
    ).toEqual(["Auxerre"]);
  });
});
