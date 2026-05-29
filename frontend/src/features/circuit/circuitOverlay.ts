import type { Map } from "maplibre-gl";
import type { CircuitCity } from "./circuit";

export type ProjectedCircuitCity = CircuitCity & {
  order: number;
  x: number;
  y: number;
};

export type ProjectedCircuitSegment = {
  key: string;
  left: number;
  top: number;
  length: number;
  angleDeg: number;
};

export type ProjectedCircuitStop = CircuitCity & {
  x: number;
  y: number;
  orders: number[];
};

export function projectCircuitCities(
  map: Map | null,
  circuitCities: CircuitCity[],
): ProjectedCircuitCity[] {
  if (map === null) {
    return [];
  }

  return circuitCities.map((circuitCity, index) => {
    const projectedPoint = map.project([circuitCity.longitude, circuitCity.latitude]);

    return {
      ...circuitCity,
      order: index + 1,
      x: projectedPoint.x,
      y: projectedPoint.y,
    };
  });
}

export function createProjectedCircuitSegment(
  from: ProjectedCircuitCity,
  to: ProjectedCircuitCity,
): ProjectedCircuitSegment {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  return {
    key: `${from.inseeCode}-${to.inseeCode}`,
    left: from.x,
    top: from.y,
    length: Math.hypot(deltaX, deltaY),
    angleDeg: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
  };
}

export function groupProjectedCircuitStops(
  projectedCircuitCities: ProjectedCircuitCity[],
): ProjectedCircuitStop[] {
  const groupedStops = new globalThis.Map<string, ProjectedCircuitStop>();

  for (const projectedCircuitCity of projectedCircuitCities) {
    const existingStop = groupedStops.get(projectedCircuitCity.inseeCode);

    if (existingStop !== undefined) {
      existingStop.orders.push(projectedCircuitCity.order);
      continue;
    }

    groupedStops.set(projectedCircuitCity.inseeCode, {
      inseeCode: projectedCircuitCity.inseeCode,
      name: projectedCircuitCity.name,
      population: projectedCircuitCity.population,
      latitude: projectedCircuitCity.latitude,
      longitude: projectedCircuitCity.longitude,
      x: projectedCircuitCity.x,
      y: projectedCircuitCity.y,
      orders: [projectedCircuitCity.order],
    });
  }

  return [...groupedStops.values()];
}
