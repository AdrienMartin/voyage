import type { AdministrativeAreaFeatureProperties } from "./useAdministrativeAreas";

export type AreaOption = {
  code: string;
  name: string;
};

export function toAreaOptions(
  featureCollection:
    | GeoJSON.FeatureCollection<GeoJSON.Geometry, AdministrativeAreaFeatureProperties>
    | null,
): AreaOption[] {
  if (featureCollection === null || !Array.isArray(featureCollection.features)) {
    return [];
  }

  return featureCollection.features
    .map((feature) => ({
      code: feature.properties.code,
      name: feature.properties.nom,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
}
