import { useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";

export type AdministrativeAreaFeatureProperties = {
  code: string;
  nom: string;
  codeRegion?: string;
  region?: string;
};

export type AdministrativeAreasState = {
  departments: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> | null;
  regions: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> | null;
  isLoading: boolean;
  errorMessage: string | null;
};

const REGIONS_DATA_URL = "/data/regions-1000m.geojson";
const DEPARTMENTS_DATA_URL = "/data/departements-1000m.geojson";
const METROPOLITAN_REGION_CODES = new Set([
  "11",
  "24",
  "27",
  "28",
  "32",
  "44",
  "52",
  "53",
  "75",
  "76",
  "84",
  "93",
  "94",
]);

let administrativeAreasCache:
  | {
      departments: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties>;
      regions: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties>;
    }
  | null = null;
let administrativeAreasPromise:
  | Promise<{
      departments: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties>;
      regions: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties>;
    }>
  | null = null;

export function useAdministrativeAreas(): AdministrativeAreasState {
  const [departments, setDepartments] = useState<
    FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> | null
  >(administrativeAreasCache?.departments ?? null);
  const [regions, setRegions] = useState<
    FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> | null
  >(administrativeAreasCache?.regions ?? null);
  const [isLoading, setIsLoading] = useState(administrativeAreasCache === null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadAdministrativeAreas() {
      try {
        if (administrativeAreasCache !== null) {
          setDepartments(administrativeAreasCache.departments);
          setRegions(administrativeAreasCache.regions);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        if (administrativeAreasPromise === null) {
          administrativeAreasPromise = loadAdministrativeAreasOnce();
        }

        const administrativeAreas = await administrativeAreasPromise;
        if (!isActive) {
          return;
        }

        setRegions(administrativeAreas.regions);
        setDepartments(administrativeAreas.departments);
      } catch (error) {
        console.error(error);
        if (isActive) {
          setErrorMessage("Impossible de charger les regions et departements.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAdministrativeAreas();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    departments,
    regions,
    isLoading,
    errorMessage,
  };
}

async function loadAdministrativeAreasOnce() {
  const [regionsResponse, departmentsResponse] = await Promise.all([
    fetch(REGIONS_DATA_URL),
    fetch(DEPARTMENTS_DATA_URL),
  ]);

  if (!regionsResponse.ok || !departmentsResponse.ok) {
    throw new Error("Administrative area request failed");
  }

  const [regionsPayload, departmentsPayload] = await Promise.all([
    regionsResponse.json() as Promise<unknown>,
    departmentsResponse.json() as Promise<unknown>,
  ]);

  const administrativeAreas = {
    regions: filterAdministrativeAreas(
      normalizeAdministrativeAreasResponse(regionsPayload),
      isMetropolitanRegionCode,
    ),
    departments: filterAdministrativeAreas(
      normalizeAdministrativeAreasResponse(departmentsPayload),
      isMetropolitanDepartmentCode,
    ),
  };

  administrativeAreasCache = administrativeAreas;
  return administrativeAreas;
}

function normalizeAdministrativeAreasResponse(
  payload: unknown,
): FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> {
  if (isFeatureCollection(payload)) {
    return payload;
  }

  if (!Array.isArray(payload)) {
    return emptyAdministrativeAreasFeatureCollection();
  }

  return {
    type: "FeatureCollection",
    features: payload.reduce<Array<GeoJSON.Feature<Geometry, AdministrativeAreaFeatureProperties>>>(
      (features, item) => {
        const feature = toAdministrativeAreaFeature(item);
        if (feature !== null) {
          features.push(feature);
        }
        return features;
      },
      [],
    ),
  };
}

function toAdministrativeAreaFeature(item: unknown) {
  if (!isAdministrativeAreaRecord(item)) {
    return null;
  }

  const geometry = item.contour ?? item.geometry;
  if (geometry === undefined || geometry === null) {
    return null;
  }

  return {
    type: "Feature" as const,
    properties: {
      code: item.code,
      nom: item.nom,
      codeRegion: item.codeRegion ?? item.region,
      region: item.region,
    },
    geometry,
  };
}

function isFeatureCollection(
  payload: unknown,
): payload is FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    payload.type === "FeatureCollection" &&
    "features" in payload &&
    Array.isArray(payload.features)
  );
}

function isAdministrativeAreaRecord(
  payload: unknown,
): payload is {
  code: string;
  nom: string;
  codeRegion?: string;
  region?: string;
  contour?: Geometry;
  geometry?: Geometry;
} {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    typeof payload.code === "string" &&
    "nom" in payload &&
    typeof payload.nom === "string"
  );
}

function emptyAdministrativeAreasFeatureCollection(): FeatureCollection<
  Geometry,
  AdministrativeAreaFeatureProperties
> {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function filterAdministrativeAreas(
  featureCollection: FeatureCollection<Geometry, AdministrativeAreaFeatureProperties>,
  predicate: (code: string) => boolean,
): FeatureCollection<Geometry, AdministrativeAreaFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: featureCollection.features.filter((feature) =>
      predicate(feature.properties.code),
    ),
  };
}

function isMetropolitanRegionCode(code: string) {
  return METROPOLITAN_REGION_CODES.has(code);
}

function isMetropolitanDepartmentCode(code: string) {
  return /^([0-8]\d|9[0-5]|2A|2B)$/.test(code);
}
