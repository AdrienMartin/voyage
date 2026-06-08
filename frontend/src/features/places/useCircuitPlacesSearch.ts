import { useEffect, useRef, useState } from "react";
import { fetchCircuitPlaces } from "../../lib/api";
import type { VisitPlace } from "../../types/places";
import type { CircuitCity } from "../circuit/circuit";
import { resolvePlaceSearchPlan } from "./placeSearchPlan";

type UseCircuitPlacesSearchInput = {
  isEnabled: boolean;
  circuitCities: CircuitCity[];
  proximityRadiusMeters: number;
};

type UseCircuitPlacesSearchResult = {
  visitPlaces: VisitPlace[];
  isLoadingVisitPlaces: boolean;
  visitPlacesErrorMessage: string | null;
};

export function useCircuitPlacesSearch({
  isEnabled,
  circuitCities,
  proximityRadiusMeters,
}: UseCircuitPlacesSearchInput): UseCircuitPlacesSearchResult {
  const [visitPlaces, setVisitPlaces] = useState<VisitPlace[]>([]);
  const [isLoadingVisitPlaces, setIsLoadingVisitPlaces] = useState(false);
  const [visitPlacesErrorMessage, setVisitPlacesErrorMessage] = useState<string | null>(
    null,
  );
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const searchPlan = resolvePlaceSearchPlan({
      isEnabled,
      circuitCities,
      proximityRadiusMeters,
    });

    if (searchPlan.type === "none") {
      latestRequestIdRef.current += 1;
      setVisitPlaces([]);
      setIsLoadingVisitPlaces(false);
      setVisitPlacesErrorMessage(null);
      return;
    }

    const abortController = new AbortController();
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setVisitPlaces([]);
    setIsLoadingVisitPlaces(true);
    setVisitPlacesErrorMessage(null);

    void fetchCircuitPlaces({
      circuitPoints: searchPlan.circuitPoints,
      proximityRadiusMeters: searchPlan.proximityRadiusMeters,
      signal: abortController.signal,
    })
      .then((response) => {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        setVisitPlaces(response.places);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted || latestRequestIdRef.current !== requestId) {
          return;
        }

        console.error(error);
        setVisitPlaces([]);
        setVisitPlacesErrorMessage(
          "Impossible de charger les lieux a visiter pour ce circuit.",
        );
      })
      .finally(() => {
        if (!abortController.signal.aborted && latestRequestIdRef.current === requestId) {
          setIsLoadingVisitPlaces(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [circuitCities, isEnabled, proximityRadiusMeters]);

  return {
    visitPlaces,
    isLoadingVisitPlaces,
    visitPlacesErrorMessage,
  };
}
