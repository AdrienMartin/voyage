import type { City } from "../../types/cities";

export type CircuitCity = Pick<
  City,
  "inseeCode" | "name" | "population" | "latitude" | "longitude"
>;

export type CircuitHistory = {
  past: CircuitCity[][];
  present: CircuitCity[];
  future: CircuitCity[][];
};

export type CircuitLeg = {
  order: number;
  city: CircuitCity;
  distanceFromPreviousKm: number;
};

const EARTH_RADIUS_KM = 6_371;

export function createCircuitHistory(): CircuitHistory {
  return {
    past: [],
    present: [],
    future: [],
  };
}

export function toCircuitCity(city: City): CircuitCity {
  return {
    ...pickCircuitCityFields(city),
  };
}

export function addCircuitCity(
  circuitCities: CircuitCity[],
  city: City | CircuitCity,
): CircuitCity[] {
  return [...circuitCities, pickCircuitCityFields(city)];
}

export function pushCircuitHistory(
  history: CircuitHistory,
  nextCircuitCities: CircuitCity[],
): CircuitHistory {
  if (areCircuitCitiesEqual(history.present, nextCircuitCities)) {
    return history;
  }

  return {
    past: [...history.past, history.present],
    present: nextCircuitCities,
    future: [],
  };
}

export function undoCircuitHistory(history: CircuitHistory): CircuitHistory {
  const previousCircuit = history.past.at(-1);
  if (previousCircuit === undefined) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: previousCircuit,
    future: [history.present, ...history.future],
  };
}

export function redoCircuitHistory(history: CircuitHistory): CircuitHistory {
  const nextCircuit = history.future[0];
  if (nextCircuit === undefined) {
    return history;
  }

  return {
    past: [...history.past, history.present],
    present: nextCircuit,
    future: history.future.slice(1),
  };
}

export function resetCircuitHistory(history: CircuitHistory): CircuitHistory {
  return pushCircuitHistory(history, []);
}

export function getCircuitLegs(circuitCities: CircuitCity[]): CircuitLeg[] {
  return circuitCities.map((city, index) => ({
    order: index + 1,
    city,
    distanceFromPreviousKm:
      index === 0 ? 0 : getDistanceInKilometers(circuitCities[index - 1], city),
  }));
}

export function getCircuitTotalDistanceKm(circuitCities: CircuitCity[]) {
  return getCircuitLegs(circuitCities).reduce(
    (totalDistance, leg) => totalDistance + leg.distanceFromPreviousKm,
    0,
  );
}

function pickCircuitCityFields(city: City | CircuitCity): CircuitCity {
  return {
    inseeCode: city.inseeCode,
    name: city.name,
    population: city.population,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}

function areCircuitCitiesEqual(left: CircuitCity[], right: CircuitCity[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftCity, index) => {
    const rightCity = right[index];
    return (
      leftCity.inseeCode === rightCity.inseeCode &&
      leftCity.name === rightCity.name &&
      leftCity.population === rightCity.population &&
      leftCity.latitude === rightCity.latitude &&
      leftCity.longitude === rightCity.longitude
    );
  });
}

function getDistanceInKilometers(from: CircuitCity, to: CircuitCity) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
