import { useEffect, useRef, useState } from "react";
import { fetchCities, fetchCitiesByAdministrativeAreas } from "../../lib/api";
import type { City } from "../../types/cities";
import type { SelectedPoint } from "../../types/geo";
import type { SelectionMode } from "../../types/selection";

type UseCitiesSearchInput = {
  selectionMode: SelectionMode;
  selectedPoint: SelectedPoint | null;
  selectedDepartmentCodes: string[];
  selectedRegionCodes: string[];
  radiusInMeters: number;
};

type UseCitiesSearchResult = {
  cities: City[];
  cityErrorMessage: string | null;
  isLoadingCities: boolean;
};

export function useCitiesSearch({
  selectionMode,
  selectedPoint,
  selectedDepartmentCodes,
  selectedRegionCodes,
  radiusInMeters,
}: UseCitiesSearchInput): UseCitiesSearchResult {
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityErrorMessage, setCityErrorMessage] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const hasAdministrativeSelection =
      (selectionMode === "department" && selectedDepartmentCodes.length > 0) ||
      (selectionMode === "region" && selectedRegionCodes.length > 0);
    const shouldSearchByZone = selectionMode === "zone" && selectedPoint !== null;

    if (!hasAdministrativeSelection && !shouldSearchByZone) {
      latestRequestIdRef.current += 1;
      setCities([]);
      setIsLoadingCities(false);
      setCityErrorMessage(null);
      return;
    }

    const abortController = new AbortController();
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setCities([]);
    setIsLoadingCities(true);
    setCityErrorMessage(null);

    const cityRequest =
      selectionMode === "zone" && selectedPoint !== null
        ? fetchCities({
            point: selectedPoint,
            radiusInMeters,
            signal: abortController.signal,
          })
        : fetchCitiesByAdministrativeAreas({
            departmentCodes:
              selectionMode === "department" ? selectedDepartmentCodes : undefined,
            regionCodes: selectionMode === "region" ? selectedRegionCodes : undefined,
            signal: abortController.signal,
          });

    void cityRequest
      .then((response) => {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        setCities(response.cities);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted || latestRequestIdRef.current !== requestId) {
          return;
        }

        console.error(error);
        setCities([]);
        setCityErrorMessage("Impossible de charger les villes pour cette selection.");
      })
      .finally(() => {
        if (!abortController.signal.aborted && latestRequestIdRef.current === requestId) {
          setIsLoadingCities(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [
    radiusInMeters,
    selectedDepartmentCodes,
    selectedPoint,
    selectedRegionCodes,
    selectionMode,
  ]);

  return {
    cities,
    cityErrorMessage,
    isLoadingCities,
  };
}
