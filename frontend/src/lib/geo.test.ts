import { describe, expect, it } from "vitest";
import {
  createCircleFeature,
  formatRadiusLabel,
  getDestinationPoint,
  getDistanceInMeters,
  isPointInMetropolitanFrance,
} from "./geo";

function distanceInMeters(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lon - from.lon);
  const latitude1 = toRadians(from.lat);
  const latitude2 = toRadians(to.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

describe("createCircleFeature", () => {
  it("returns a closed polygon with the expected number of vertices", () => {
    const feature = createCircleFeature({ lat: 46.2276, lon: 2.2137 }, 50_000, 32);

    expect(feature.geometry.type).toBe("Polygon");
    expect(feature.geometry.coordinates[0]).toHaveLength(33);
    expect(feature.geometry.coordinates[0][0]).toEqual(feature.geometry.coordinates[0][32]);
  });

  it("keeps generated points close to the requested radius", () => {
    const center = { lat: 46.2276, lon: 2.2137 };
    const radiusInMeters = 80_000;
    const feature = createCircleFeature(center, radiusInMeters, 24);

    for (const [lon, lat] of feature.geometry.coordinates[0].slice(0, -1)) {
      const distance = distanceInMeters(center, { lat, lon });
      expect(distance).toBeGreaterThan(radiusInMeters * 0.99);
      expect(distance).toBeLessThan(radiusInMeters * 1.01);
    }
  });
});

describe("formatRadiusLabel", () => {
  it("formats kilometer values compactly", () => {
    expect(formatRadiusLabel(50_000)).toBe("50 km");
    expect(formatRadiusLabel(12_500)).toBe("12.5 km");
  });

  it("formats small radii in meters", () => {
    expect(formatRadiusLabel(750)).toBe("750 m");
  });
});

describe("distance helpers", () => {
  it("returns zero for identical points", () => {
    expect(
      getDistanceInMeters(
        { lat: 48.8566, lon: 2.3522 },
        { lat: 48.8566, lon: 2.3522 },
      ),
    ).toBe(0);
  });

  it("keeps destination points close to the requested distance", () => {
    const center = { lat: 46.2276, lon: 2.2137 };
    const destination = getDestinationPoint(center, 90, 120_000);
    const distance = getDistanceInMeters(center, destination);

    expect(distance).toBeGreaterThan(118_000);
    expect(distance).toBeLessThan(122_000);
  });
});

describe("isPointInMetropolitanFrance", () => {
  it("accepts points in mainland France and Corsica", () => {
    expect(isPointInMetropolitanFrance({ lat: 48.8566, lon: 2.3522 })).toBe(true);
    expect(isPointInMetropolitanFrance({ lat: 41.9192, lon: 8.7386 })).toBe(true);
  });

  it("accepts coastal and border cities that were previously too close to the edge", () => {
    expect(isPointInMetropolitanFrance({ lat: 49.6398, lon: -1.6164 })).toBe(true);
    expect(isPointInMetropolitanFrance({ lat: 48.5734, lon: 7.7521 })).toBe(true);
    expect(isPointInMetropolitanFrance({ lat: 43.7102, lon: 7.262 })).toBe(true);
    expect(isPointInMetropolitanFrance({ lat: 42.6887, lon: 2.8948 })).toBe(true);
    expect(isPointInMetropolitanFrance({ lat: 43.3597, lon: -1.7744 })).toBe(true);
    expect(isPointInMetropolitanFrance({ lat: 50.6292, lon: 3.0573 })).toBe(true);
  });

  it("rejects points outside metropolitan France", () => {
    expect(isPointInMetropolitanFrance({ lat: 51.5074, lon: -0.1278 })).toBe(false);
    expect(isPointInMetropolitanFrance({ lat: 43.2965, lon: 10.3696 })).toBe(false);
    expect(isPointInMetropolitanFrance({ lat: 40.4168, lon: -3.7038 })).toBe(false);
    expect(isPointInMetropolitanFrance({ lat: 46.2044, lon: 6.1432 })).toBe(false);
  });
});
