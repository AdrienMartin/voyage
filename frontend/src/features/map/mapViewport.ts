import type { CircuitCity } from "../circuit/circuit";

const MIN_BOUND_SPAN_DEGREES = 0.12;

export function getCircuitViewportFitKey(input: {
  circuitCities: CircuitCity[];
  isPlacesStep: boolean;
  isCircuitPlacesEnabled: boolean;
  placesViewportVersion?: string | null;
}) {
  if (
    !input.isPlacesStep ||
    !input.isCircuitPlacesEnabled ||
    input.circuitCities.length < 2
  ) {
    return null;
  }

  const circuitKey = input.circuitCities
    .map(
      (city) =>
        `${city.inseeCode}:${city.latitude.toFixed(5)}:${city.longitude.toFixed(5)}`,
    )
    .join("|");

  return input.placesViewportVersion === null || input.placesViewportVersion === undefined
    ? circuitKey
    : `${circuitKey}#${input.placesViewportVersion}`;
}

export function getCircuitViewportBounds(circuitCities: CircuitCity[]) {
  if (circuitCities.length === 0) {
    return null;
  }

  let west = circuitCities[0].longitude;
  let east = circuitCities[0].longitude;
  let south = circuitCities[0].latitude;
  let north = circuitCities[0].latitude;

  for (const city of circuitCities.slice(1)) {
    west = Math.min(west, city.longitude);
    east = Math.max(east, city.longitude);
    south = Math.min(south, city.latitude);
    north = Math.max(north, city.latitude);
  }

  if (east - west < MIN_BOUND_SPAN_DEGREES) {
    const longitudePadding = (MIN_BOUND_SPAN_DEGREES - (east - west)) / 2;
    west -= longitudePadding;
    east += longitudePadding;
  }

  if (north - south < MIN_BOUND_SPAN_DEGREES) {
    const latitudePadding = (MIN_BOUND_SPAN_DEGREES - (north - south)) / 2;
    south -= latitudePadding;
    north += latitudePadding;
  }

  return [
    [west, south],
    [east, north],
  ] as [[number, number], [number, number]];
}
