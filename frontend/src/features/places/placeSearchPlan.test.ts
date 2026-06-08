import { describe, expect, it } from "vitest";
import { resolvePlaceSearchPlan } from "./placeSearchPlan";

describe("resolvePlaceSearchPlan", () => {
  it("returns none when the option is disabled", () => {
    expect(
      resolvePlaceSearchPlan({
        isEnabled: false,
        circuitCities: [
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
        ],
        proximityRadiusMeters: 10_000,
      }),
    ).toEqual({ type: "none" });
  });

  it("returns none when the circuit is too short", () => {
    expect(
      resolvePlaceSearchPlan({
        isEnabled: true,
        circuitCities: [
          {
            inseeCode: "44109",
            name: "Nantes",
            population: 323204,
            latitude: 47.2184,
            longitude: -1.5536,
          },
        ],
        proximityRadiusMeters: 10_000,
      }),
    ).toEqual({ type: "none" });
  });

  it("returns a searchable plan when the option is enabled and the circuit is valid", () => {
    expect(
      resolvePlaceSearchPlan({
        isEnabled: true,
        circuitCities: [
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
        ],
        proximityRadiusMeters: 10_000,
      }),
    ).toEqual({
      type: "search",
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
    });
  });
});
