import type { Geometry } from "geojson";
import type { Map } from "maplibre-gl";
import type { AdministrativeAreaFeatureProperties } from "./useAdministrativeAreas";

export type ProjectedAdministrativeArea = {
  code: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
};

export type ProjectedAdministrativeAreas = {
  features: ProjectedAdministrativeArea[];
  width: number;
  height: number;
};

export function projectAdministrativeAreas(
  map: Map | null,
  featureCollection:
    | GeoJSON.FeatureCollection<Geometry, AdministrativeAreaFeatureProperties>
    | null,
): ProjectedAdministrativeAreas | null {
  if (map === null || featureCollection === null) {
    return null;
  }

  const container = map.getContainer();

  return {
    width: container.clientWidth,
    height: container.clientHeight,
    features: featureCollection.features
      .map((feature) => projectAdministrativeArea(map, feature))
      .filter((feature): feature is ProjectedAdministrativeArea => feature !== null),
  };
}

function projectAdministrativeArea(
  map: Map,
  feature: GeoJSON.Feature<Geometry, AdministrativeAreaFeatureProperties>,
): ProjectedAdministrativeArea | null {
  const polygons = getGeometryPolygons(feature.geometry);
  if (polygons.length === 0) {
    return null;
  }

  const pathParts: string[] = [];
  const projectedPoints: Array<{ x: number; y: number }> = [];

  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projectedRing = ring.map(([longitude, latitude]) => {
        const projectedPoint = map.project([longitude, latitude]);
        const point = { x: projectedPoint.x, y: projectedPoint.y };
        projectedPoints.push(point);
        return point;
      });

      if (projectedRing.length === 0) {
        continue;
      }

      pathParts.push(
        `M ${projectedRing[0].x} ${projectedRing[0].y} ${projectedRing
          .slice(1)
          .map((point) => `L ${point.x} ${point.y}`)
          .join(" ")} Z`,
      );
    }
  }

  if (pathParts.length === 0 || projectedPoints.length === 0) {
    return null;
  }

  const bounds = projectedPoints.reduce(
    (currentBounds, point) => ({
      minX: Math.min(currentBounds.minX, point.x),
      maxX: Math.max(currentBounds.maxX, point.x),
      minY: Math.min(currentBounds.minY, point.y),
      maxY: Math.max(currentBounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  return {
    code: feature.properties.code,
    name: feature.properties.nom,
    path: pathParts.join(" "),
    labelX: (bounds.minX + bounds.maxX) / 2,
    labelY: (bounds.minY + bounds.maxY) / 2,
  };
}

function getGeometryPolygons(geometry: Geometry): number[][][][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates;
  }

  return [];
}
