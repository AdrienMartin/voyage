export const DEFAULT_CIRCUIT_PLACES_RADIUS_IN_METERS = 10_000;

export function canShowCircuitPlaces(circuitCityCount: number) {
  return circuitCityCount >= 2;
}
