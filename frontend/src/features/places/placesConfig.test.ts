import { describe, expect, it } from "vitest";
import {
  canShowCircuitPlaces,
  DEFAULT_CIRCUIT_PLACES_RADIUS_IN_METERS,
} from "./placesConfig";

describe("canShowCircuitPlaces", () => {
  it("rejects an empty circuit", () => {
    expect(canShowCircuitPlaces(0)).toBe(false);
  });

  it("rejects a single-city circuit", () => {
    expect(canShowCircuitPlaces(1)).toBe(false);
  });

  it("accepts a circuit with at least two cities", () => {
    expect(canShowCircuitPlaces(2)).toBe(true);
    expect(canShowCircuitPlaces(5)).toBe(true);
  });
});

describe("DEFAULT_CIRCUIT_PLACES_RADIUS_IN_METERS", () => {
  it("uses a conservative default radius around the circuit", () => {
    expect(DEFAULT_CIRCUIT_PLACES_RADIUS_IN_METERS).toBe(10_000);
  });
});
