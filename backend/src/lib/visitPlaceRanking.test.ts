import { describe, expect, it } from "vitest";
import { computeVisitPlaceRankingScore } from "./visitPlaceRanking.js";

describe("computeVisitPlaceRankingScore", () => {
  it("prioritizes richer tourism records over sparse ones", () => {
    const sparseScore = computeVisitPlaceRankingScore({
      category: "Lieu touristique",
      subCategory: null,
      description: null,
      commune: null,
      imageUrl: null,
      websiteUrl: null,
      sourceUpdatedAt: null,
    });

    const richScore = computeVisitPlaceRankingScore({
      category: "Museum",
      subCategory: null,
      description:
        "Un musee reconnu avec une description detaillee, des collections permanentes et plusieurs informations utiles pour preparer la visite.",
      commune: "Tours",
      imageUrl: "https://example.test/image.jpg",
      websiteUrl: "https://example.test/place",
      sourceUpdatedAt: "2026-06-01T10:00:00Z",
    });

    expect(richScore).toBeGreaterThan(sparseScore);
  });

  it("gives an explicit bonus when an image is present", () => {
    const withoutImage = computeVisitPlaceRankingScore({
      category: "Museum",
      subCategory: null,
      description: "Une fiche de qualite avec plusieurs informations utiles.",
      commune: "Tours",
      imageUrl: null,
      websiteUrl: "https://example.test/place",
      sourceUpdatedAt: "2026-06-01T10:00:00Z",
    });

    const withImage = computeVisitPlaceRankingScore({
      category: "Museum",
      subCategory: null,
      description: "Une fiche de qualite avec plusieurs informations utiles.",
      commune: "Tours",
      imageUrl: "https://example.test/image.jpg",
      websiteUrl: "https://example.test/place",
      sourceUpdatedAt: "2026-06-01T10:00:00Z",
    });

    expect(withImage - withoutImage).toBe(10);
  });

  it("uses category weights to rank stronger heritage categories higher", () => {
    const museumScore = computeVisitPlaceRankingScore({
      category: "Museum",
      subCategory: null,
      description: null,
      commune: null,
      imageUrl: null,
      websiteUrl: null,
      sourceUpdatedAt: null,
    });

    const touristOfficeScore = computeVisitPlaceRankingScore({
      category: "Local Tourist Office",
      subCategory: null,
      description: null,
      commune: null,
      imageUrl: null,
      websiteUrl: null,
      sourceUpdatedAt: null,
    });

    expect(museumScore).toBeGreaterThan(touristOfficeScore);
  });

  it("falls back to the sub-category when the main category is generic", () => {
    const score = computeVisitPlaceRankingScore({
      category: "Lieu touristique",
      subCategory: "Castle",
      description: null,
      commune: null,
      imageUrl: null,
      websiteUrl: null,
      sourceUpdatedAt: null,
    });

    expect(score).toBe(28);
  });
});
