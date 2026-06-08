import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  buildVisitPlacesFromContents,
  forEachVisitPlaceFromFile,
  normalizeDatatourismePlace,
} from "./visitPlaces.js";

describe("normalizeDatatourismePlace", () => {
  it("maps a complete DATAtourisme node to the app model", () => {
    expect(
      normalizeDatatourismePlace({
        "@id": "https://example.test/place/1",
        "@type": ["schema:Place", "dt:Museum"],
        "rdfs:label": "Musee de la Loire",
        "schema:description":
          "  Un   musee   dedie a l'histoire fluviale.  ",
        "schema:geo": {
          "schema:latitude": "47.321",
          "schema:longitude": "0.689",
        },
        "schema:address": {
          "schema:addressLocality": "Tours",
        },
        "schema:image": {
          "@id": "https://example.test/image.jpg",
        },
        "schema:url": "https://example.test/place/1",
        "schema:dateModified": "2026-06-01T10:00:00Z",
      }),
    ).toEqual({
      source: "DATAtourisme",
      sourceId: "https://example.test/place/1",
      name: "Musee de la Loire",
      category: "Museum",
      subCategory: null,
      description: "Un musee dedie a l'histoire fluviale.",
      commune: "Tours",
      latitude: 47.321,
      longitude: 0.689,
      imageUrl: "https://example.test/image.jpg",
      websiteUrl: "https://example.test/place/1",
      rankingScore: 52,
      sourceUpdatedAt: "2026-06-01T10:00:00Z",
    });
  });

  it("rejects a node without coordinates", () => {
    expect(
      normalizeDatatourismePlace({
        "@id": "https://example.test/place/2",
        "rdfs:label": "Lieu sans coordonnees",
      }),
    ).toBeNull();
  });

  it("truncates overly verbose descriptions", () => {
    const description = "A".repeat(600);
    const visitPlace = normalizeDatatourismePlace({
      "@id": "https://example.test/place/3",
      "rdfs:label": "Lieu bavard",
      "schema:description": description,
      "schema:geo": {
        "schema:latitude": 46.5,
        "schema:longitude": 2.2,
      },
    });

    expect(visitPlace?.description).toHaveLength(500);
    expect(visitPlace?.description?.endsWith("…")).toBe(true);
  });

  it("ignores invalid URLs and keeps useful fallback fields null", () => {
    expect(
      normalizeDatatourismePlace({
        "@id": "https://example.test/place/4",
        "@type": ["schema:Place", "dt:ReligiousSite"],
        "rdfs:label": "Abbatiale",
        "schema:geo": {
          "schema:latitude": 45.1,
          "schema:longitude": 1.2,
        },
        "schema:image": "ftp://example.test/image.jpg",
        "schema:url": "notaurl",
      }),
    ).toMatchObject({
      category: "Religious Site",
      imageUrl: null,
      websiteUrl: null,
      commune: null,
      description: null,
    });
  });

  it("assigns a higher ranking score to richer places", () => {
    const sparsePlace = normalizeDatatourismePlace({
      "@id": "https://example.test/place/5",
      "rdfs:label": "Lieu simple",
      "schema:geo": {
        "schema:latitude": 46.5,
        "schema:longitude": 2.2,
      },
    });

    const richPlace = normalizeDatatourismePlace({
      "@id": "https://example.test/place/6",
      "@type": ["schema:Place", "dt:Castle"],
      "rdfs:label": "Chateau visite",
      "schema:description":
        "Un chateau ouvert a la visite avec une fiche bien renseignee, plusieurs espaces remarquables et des informations utiles pour preparer la venue.",
      "schema:geo": {
        "schema:latitude": 46.6,
        "schema:longitude": 2.3,
      },
      "schema:address": {
        "schema:addressLocality": "Bourges",
      },
      "schema:image": "https://example.test/chateau.jpg",
      "schema:url": "https://example.test/chateau",
      "schema:dateModified": "2026-06-01T10:00:00Z",
    });

    expect(richPlace?.rankingScore).toBeGreaterThan(sparsePlace?.rankingScore ?? 0);
  });
});

describe("buildVisitPlacesFromContents", () => {
  it("maps a JSON-LD graph and deduplicates source ids", () => {
    const payload = JSON.stringify({
      "@graph": [
        {
          "@id": "https://example.test/place/1",
          "rdfs:label": "Premier lieu",
          "schema:geo": {
            "schema:latitude": 48.85,
            "schema:longitude": 2.35,
          },
        },
        {
          "@id": "https://example.test/place/1",
          "rdfs:label": "Premier lieu doublon",
          "schema:geo": {
            "schema:latitude": 48.85,
            "schema:longitude": 2.35,
          },
        },
        {
          "@id": "https://example.test/place/2",
          "rdfs:label": "Second lieu",
          "schema:geo": {
            "schema:latitude": 47.21,
            "schema:longitude": -1.55,
          },
        },
      ],
    });

    expect(buildVisitPlacesFromContents(payload)).toHaveLength(2);
  });
});

describe("forEachVisitPlaceFromFile", () => {
  it("streams visit places from a JSON-LD graph without loading the full payload in memory", async () => {
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "visit-places-"));
    const sourcePath = path.join(tempDirectory, "sample.jsonld");
    const streamedPlaces: string[] = [];

    await writeFile(
      sourcePath,
      JSON.stringify({
        "@context": {},
        "@graph": [
          {
            "@id": "https://example.test/place/7",
            "rdfs:label": "Premier lieu",
            "schema:geo": {
              "schema:latitude": 48.85,
              "schema:longitude": 2.35,
            },
          },
          {
            "@id": "https://example.test/place/8",
            "@type": ["schema:Place", "dt:Castle"],
            "rdfs:label": "Second lieu",
            "schema:geo": {
              "schema:latitude": 47.21,
              "schema:longitude": -1.55,
            },
          },
        ],
      }),
      "utf8",
    );

    await forEachVisitPlaceFromFile(sourcePath, async (visitPlace) => {
      streamedPlaces.push(visitPlace.sourceId);
    });

    expect(streamedPlaces).toEqual([
      "https://example.test/place/7",
      "https://example.test/place/8",
    ]);
  });

  it("streams visit places from a gzipped DATAtourisme payload", async () => {
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "visit-places-"));
    const sourcePath = path.join(tempDirectory, "sample.jsonld");
    const streamedPlaces: string[] = [];
    const payload = JSON.stringify({
      "@context": {},
      "@graph": [
        {
          "@id": "https://example.test/place/9",
          "rdfs:label": "Lieu compresse",
          "schema:geo": {
            "schema:latitude": 43.6,
            "schema:longitude": 1.44,
          },
        },
      ],
    });

    await writeFile(sourcePath, gzipSync(payload));

    await forEachVisitPlaceFromFile(sourcePath, async (visitPlace) => {
      streamedPlaces.push(visitPlace.sourceId);
    });

    expect(streamedPlaces).toEqual(["https://example.test/place/9"]);
  });
});
