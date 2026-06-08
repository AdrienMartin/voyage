import {
  DEFAULT_CIRCUIT_PLACE_LIMIT,
  DEFAULT_CIRCUIT_PLACE_RADIUS_METERS,
} from "./placeConstants.js";
import type {
  CircuitPointInput,
  CircuitVisitPlaceSearchParams,
  VisitPlaceRow,
} from "./placeTypes.js";

export function canSearchVisitPlacesForCircuit(circuitPoints: CircuitPointInput[]) {
  return circuitPoints.length >= 2;
}

export function normalizeCircuitVisitPlaceSearchParams(input: {
  circuitPoints: CircuitPointInput[];
  proximityRadiusMeters?: number;
  limit?: number;
}): CircuitVisitPlaceSearchParams {
  return {
    circuitPoints: input.circuitPoints.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })),
    proximityRadiusMeters:
      input.proximityRadiusMeters ?? DEFAULT_CIRCUIT_PLACE_RADIUS_METERS,
    limit: input.limit ?? DEFAULT_CIRCUIT_PLACE_LIMIT,
  };
}

export function formatVisitPlaceResponse(visitPlaces: VisitPlaceRow[]) {
  return {
    total: visitPlaces.length,
    places: visitPlaces.map((visitPlace) => ({
      source: visitPlace.source,
      sourceId: visitPlace.sourceId,
      name: visitPlace.name,
      category: visitPlace.category,
      subCategory: visitPlace.subCategory,
      description: visitPlace.description,
      commune: visitPlace.commune,
      latitude: visitPlace.latitude,
      longitude: visitPlace.longitude,
      imageUrl: visitPlace.imageUrl,
      websiteUrl: visitPlace.websiteUrl,
      rankingScore: visitPlace.rankingScore,
      distanceToCircuitMeters: Math.round(visitPlace.distanceToCircuitMeters),
    })),
  };
}
