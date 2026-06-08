import type { FastifyInstance } from "fastify";
import { circuitPlacesBodySchema } from "./placeSchemas.js";
import {
  formatVisitPlaceResponse,
  normalizeCircuitVisitPlaceSearchParams,
} from "./placeService.js";
import type { VisitPlaceRepository } from "./placeRepository.js";
import type { CircuitPointInput } from "./placeTypes.js";

type CircuitPlacesBody = {
  circuitPoints: CircuitPointInput[];
  proximityRadiusMeters?: number;
  limit?: number;
};

export function registerPlaceRoutes(
  app: FastifyInstance,
  repository: VisitPlaceRepository,
) {
  app.post(
    "/circuit/places",
    {
      schema: {
        body: circuitPlacesBodySchema,
      },
    },
    async (request) => {
      const params = normalizeCircuitVisitPlaceSearchParams(
        request.body as CircuitPlacesBody,
      );
      const visitPlaces = await repository.findPlacesNearCircuit(params);

      return formatVisitPlaceResponse(visitPlaces);
    },
  );
}
