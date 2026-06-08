import { describe, expect, it } from "vitest";
import { getCircuitViewportBounds, getCircuitViewportFitKey } from "./mapViewport";

const circuitCities = [
  {
    inseeCode: "44109",
    name: "Nantes",
    population: 323204,
    latitude: 47.2184,
    longitude: -1.5536,
  },
  {
    inseeCode: "75056",
    name: "Paris",
    population: 2103778,
    latitude: 48.8566,
    longitude: 2.3522,
  },
] as const;

describe("getCircuitViewportFitKey", () => {
  it("returns null outside the places step", () => {
    expect(
      getCircuitViewportFitKey({
        circuitCities: [...circuitCities],
        isPlacesStep: false,
        isCircuitPlacesEnabled: true,
      }),
    ).toBeNull();
  });

  it("returns null when places are not enabled", () => {
    expect(
      getCircuitViewportFitKey({
        circuitCities: [...circuitCities],
        isPlacesStep: true,
        isCircuitPlacesEnabled: false,
      }),
    ).toBeNull();
  });

  it("returns a stable key when the places step is active and enabled", () => {
    expect(
      getCircuitViewportFitKey({
        circuitCities: [...circuitCities],
        isPlacesStep: true,
        isCircuitPlacesEnabled: true,
      }),
    ).toBe("44109:47.21840:-1.55360|75056:48.85660:2.35220");
  });

  it("changes the key when the places viewport version changes", () => {
    expect(
      getCircuitViewportFitKey({
        circuitCities: [...circuitCities],
        isPlacesStep: true,
        isCircuitPlacesEnabled: true,
        placesViewportVersion: "loading",
      }),
    ).toBe("44109:47.21840:-1.55360|75056:48.85660:2.35220#loading");

    expect(
      getCircuitViewportFitKey({
        circuitCities: [...circuitCities],
        isPlacesStep: true,
        isCircuitPlacesEnabled: true,
        placesViewportVersion: "ready:18",
      }),
    ).toBe("44109:47.21840:-1.55360|75056:48.85660:2.35220#ready:18");
  });
});

describe("getCircuitViewportBounds", () => {
  it("returns null for an empty circuit", () => {
    expect(getCircuitViewportBounds([])).toBeNull();
  });

  it("returns bounds covering every circuit city", () => {
    expect(
      getCircuitViewportBounds([...circuitCities]),
    ).toEqual([
      [-1.5536, 47.2184],
      [2.3522, 48.8566],
    ]);
  });

  it("expands very tight circuits so fitBounds stays readable", () => {
    const bounds = getCircuitViewportBounds([
      {
        inseeCode: "37001",
        name: "Tours",
        population: 136252,
        latitude: 47.3941,
        longitude: 0.6848,
      },
      {
        inseeCode: "37002",
        name: "La Riche",
        population: 10000,
        latitude: 47.3941,
        longitude: 0.6848,
      },
    ]);

    expect(bounds).not.toBeNull();
    expect(bounds?.[1][0]! - bounds?.[0][0]!).toBeGreaterThan(0.119);
    expect(bounds?.[1][1]! - bounds?.[0][1]!).toBeGreaterThan(0.119);
  });
});
