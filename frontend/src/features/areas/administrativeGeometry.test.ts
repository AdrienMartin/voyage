import { describe, expect, it } from "vitest";
import {
  findAdministrativeAreaAtPoint,
  isPointInPolygon,
} from "./administrativeGeometry";

describe("administrativeGeometry", () => {
  it("detects a point inside a polygon", () => {
    expect(
      isPointInPolygon(
        [2, 2],
        [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
      ),
    ).toBe(true);
  });

  it("rejects a point outside a polygon", () => {
    expect(
      isPointInPolygon(
        [6, 2],
        [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
      ),
    ).toBe(false);
  });

  it("finds the matching administrative area at a point", () => {
    const areas: GeoJSON.FeatureCollection<
      GeoJSON.Geometry,
      { code: string; nom: string }
    > = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            code: "A",
            nom: "Zone A",
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]]],
          },
        },
        {
          type: "Feature",
          properties: {
            code: "B",
            nom: "Zone B",
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[4, 0], [7, 0], [7, 3], [4, 3], [4, 0]]],
          },
        },
      ],
    };

    expect(
      findAdministrativeAreaAtPoint(areas, {
        lat: 1.5,
        lon: 5.5,
      }),
    ).toEqual({
      code: "B",
      nom: "Zone B",
    });
  });

  it("returns null when no administrative area matches the point", () => {
    const areas: GeoJSON.FeatureCollection<
      GeoJSON.Geometry,
      { code: string; nom: string }
    > = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            code: "A",
            nom: "Zone A",
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]]],
          },
        },
      ],
    };

    expect(
      findAdministrativeAreaAtPoint(areas, {
        lat: 10,
        lon: 10,
      }),
    ).toBeNull();
  });
});
