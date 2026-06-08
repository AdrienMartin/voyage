import type { CircuitCity } from "../circuit/circuit";
import { canShowCircuitPlaces } from "./placesConfig";

export type PlaceSearchPlan =
  | { type: "none" }
  | {
      type: "search";
      circuitPoints: Array<{
        latitude: number;
        longitude: number;
      }>;
      proximityRadiusMeters: number;
    };

export function resolvePlaceSearchPlan(input: {
  isEnabled: boolean;
  circuitCities: CircuitCity[];
  proximityRadiusMeters: number;
}): PlaceSearchPlan {
  if (!input.isEnabled || !canShowCircuitPlaces(input.circuitCities.length)) {
    return { type: "none" };
  }

  return {
    type: "search",
    circuitPoints: input.circuitCities.map((city) => ({
      latitude: city.latitude,
      longitude: city.longitude,
    })),
    proximityRadiusMeters: input.proximityRadiusMeters,
  };
}
