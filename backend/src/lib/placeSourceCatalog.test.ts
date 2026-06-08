import { describe, expect, it } from "vitest";
import { findDatasetResourceByTitle, type DataGouvDatasetResource } from "./placeSourceCatalog.js";

const resources: DataGouvDatasetResource[] = [
  {
    id: "events",
    title: "Événements touristiques",
    url: "https://example.test/events.jsonld",
  },
  {
    id: "sites",
    title: "Sites touristiques",
    url: "https://example.test/sites.jsonld",
  },
];

describe("findDatasetResourceByTitle", () => {
  it("returns the expected resource when the title matches exactly", () => {
    expect(findDatasetResourceByTitle(resources, "Sites touristiques")).toEqual(resources[1]);
  });

  it("matches titles case-insensitively and ignores surrounding spaces", () => {
    expect(findDatasetResourceByTitle(resources, "  sites touristiques ")).toEqual(resources[1]);
  });

  it("throws when the expected resource does not exist", () => {
    expect(() =>
      findDatasetResourceByTitle(resources, "Produits touristiques"),
    ).toThrow('Unable to find dataset resource "Produits touristiques".');
  });
});
