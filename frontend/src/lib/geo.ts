import type { Feature, Polygon } from "geojson";
import type { SelectedPoint } from "../types/geo";

const EARTH_RADIUS_METERS = 6_371_000;
const METROPOLITAN_FRANCE_POLYGONS: Array<Array<[number, number]>> = [
  [
    [-5.25, 48.63],
    [-4.75, 48.38],
    [-4.82, 47.95],
    [-4.45, 47.55],
    [-3.65, 47.24],
    [-2.95, 47.05],
    [-2.15, 46.82],
    [-1.55, 46.38],
    [-1.32, 45.92],
    [-1.22, 45.37],
    [-1.31, 44.82],
    [-1.12, 44.25],
    [-1.45, 43.72],
    [-1.86, 43.47],
    [-1.78, 43.28],
    [-1.12, 43.34],
    [-0.38, 43.24],
    [0.24, 42.92],
    [1.35, 42.53],
    [2.72, 42.43],
    [3.28, 42.51],
    [4.18, 43.02],
    [5.25, 43.17],
    [6.12, 43.13],
    [7.12, 43.50],
    [7.53, 43.74],
    [7.63, 44.42],
    [7.51, 44.94],
    [7.10, 45.54],
    [6.48, 45.93],
    [6.05, 46.24],
    [6.43, 46.70],
    [7.07, 47.48],
    [7.52, 47.84],
    [7.76, 48.21],
    [8.08, 48.58],
    [7.91, 48.96],
    [7.32, 49.05],
    [6.26, 49.52],
    [4.96, 49.99],
    [4.11, 49.91],
    [3.12, 50.36],
    [3.34, 50.61],
    [3.03, 50.86],
    [2.56, 50.75],
    [1.66, 50.89],
    [0.78, 50.69],
    [0.18, 50.11],
    [-0.73, 49.53],
    [-1.71, 49.71],
    [-2.29, 49.62],
    [-3.22, 49.04],
    [-4.18, 48.71],
    [-5.25, 48.63],
  ],
  [
    [8.5, 41.3],
    [8.8, 41.9],
    [9.5, 42.9],
    [9.6, 43.1],
    [9.2, 43.0],
    [8.8, 42.6],
    [8.6, 42.2],
    [8.4, 41.8],
    [8.5, 41.3],
  ],
];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function getDistanceInMeters(
  from: SelectedPoint,
  to: SelectedPoint,
) {
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lon - from.lon);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getDestinationPoint(
  center: SelectedPoint,
  bearingDegrees: number,
  distanceInMeters: number,
): SelectedPoint {
  const angularDistance = distanceInMeters / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDegrees);
  const latitude = toRadians(center.lat);
  const longitude = toRadians(center.lon);
  const pointLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const pointLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(pointLatitude),
    );

  return {
    lat: toDegrees(pointLatitude),
    lon: toDegrees(pointLongitude),
  };
}

export function createCircleFeature(
  center: SelectedPoint,
  radiusInMeters: number,
  steps = 64,
): Feature<Polygon> {
  const angularDistance = radiusInMeters / EARTH_RADIUS_METERS;
  const latitude = toRadians(center.lat);
  const longitude = toRadians(center.lon);
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= steps; index += 1) {
    const bearing = (2 * Math.PI * index) / steps;
    const pointLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angularDistance) +
        Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLongitude =
      longitude +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
        Math.cos(angularDistance) -
          Math.sin(latitude) * Math.sin(pointLatitude),
      );

    coordinates.push([
      toDegrees(pointLongitude),
      toDegrees(pointLatitude),
    ]);
  }

  return {
    type: "Feature",
    properties: {
      radiusInMeters,
    },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

export function formatRadiusLabel(radiusInMeters: number) {
  if (radiusInMeters >= 1000) {
    return `${Math.round(radiusInMeters / 100) / 10} km`;
  }

  return `${radiusInMeters} m`;
}

export function isPointInMetropolitanFrance(point: SelectedPoint) {
  return METROPOLITAN_FRANCE_POLYGONS.some((polygon) =>
    isPointInPolygon([point.lon, point.lat], polygon),
  );
}

function isPointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>,
) {
  let isInside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const [currentX, currentY] = polygon[currentIndex];
    const [previousX, previousY] = polygon[previousIndex];
    const intersects =
      currentY > point[1] !== previousY > point[1] &&
      point[0] <
        ((previousX - currentX) * (point[1] - currentY)) /
          (previousY - currentY) +
          currentX;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}
