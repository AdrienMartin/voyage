import type { Geometry, Position } from "geojson";
import type { AdministrativeAreaFeatureProperties } from "./useAdministrativeAreas";
import type { SelectedPoint } from "../../types/geo";

export function findAdministrativeAreaAtPoint(
  featureCollection:
    | GeoJSON.FeatureCollection<GeoJSON.Geometry, AdministrativeAreaFeatureProperties>
    | null,
  point: SelectedPoint,
) {
  if (featureCollection === null) {
    return null;
  }

  const targetPoint: [number, number] = [point.lon, point.lat];

  for (const feature of featureCollection.features) {
    if (isPointInGeometry(targetPoint, feature.geometry)) {
      return feature.properties;
    }
  }

  return null;
}

export function isPointInGeometry(
  point: [number, number],
  geometry: Geometry,
) {
  if (geometry.type === "Polygon") {
    return isPointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => isPointInPolygon(point, polygon));
  }

  return false;
}

export function isPointInPolygon(
  point: [number, number],
  polygon: Position[][],
) {
  if (polygon.length === 0) {
    return false;
  }

  if (!isPointInRing(point, polygon[0])) {
    return false;
  }

  return !polygon.slice(1).some((ring) => isPointInRing(point, ring));
}

export function isPointInRing(
  point: [number, number],
  ring: Position[],
) {
  let isInside = false;
  const [pointX, pointY] = point;

  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index++
  ) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previousIndex];

    const intersects =
      y1 > pointY !== y2 > pointY &&
      pointX < ((x2 - x1) * (pointY - y1)) / (y2 - y1) + x1;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}
