import type { FastifyInstance } from "fastify";
import {
  cityAdministrativeQuerySchema,
  cityQuerySchema,
} from "./citySchemas.js";
import {
  formatCityResponse,
  normalizeAdministrativeCitySearchParams,
  normalizeCitySearchParams,
} from "./cityService.js";
import type { CityRepository } from "./cityRepository.js";
import type { CitySearchParams } from "./cityTypes.js";

type CityQuery = Pick<CitySearchParams, "lat" | "lon" | "radius"> & {
  limit?: number;
};

type AdministrativeCityQuery = {
  departmentCodes?: string;
  regionCodes?: string;
  limit?: number;
};

export function registerCityRoutes(
  app: FastifyInstance,
  repository: CityRepository,
) {
  app.get(
    "/cities",
    {
      schema: {
        querystring: cityQuerySchema,
      },
    },
    async (request) => {
      const params = normalizeCitySearchParams(request.query as CityQuery);
      const cities = await repository.findCitiesWithinRadius(params);

      return formatCityResponse(cities);
    },
  );

  app.get(
    "/cities/administrative",
    {
      schema: {
        querystring: cityAdministrativeQuerySchema,
      },
    },
    async (request) => {
      const params = normalizeAdministrativeCitySearchParams(
        request.query as AdministrativeCityQuery,
      );
      const cities = await repository.findCitiesByAdministrativeAreas(params);

      return formatCityResponse(cities);
    },
  );
}
