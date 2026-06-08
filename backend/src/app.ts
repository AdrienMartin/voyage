import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import {
  createPostgresCityRepository,
  type CityRepository,
} from "./features/cities/cityRepository.js";
import { registerCityRoutes } from "./features/cities/cityRoutes.js";
import {
  createPostgresVisitPlaceRepository,
  type VisitPlaceRepository,
} from "./features/places/placeRepository.js";
import { registerPlaceRoutes } from "./features/places/placeRoutes.js";

type BuildAppOptions = {
  cityRepository?: CityRepository;
  visitPlaceRepository?: VisitPlaceRepository;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });
  const cityRepository =
    options.cityRepository ?? createPostgresCityRepository();
  const visitPlaceRepository =
    options.visitPlaceRepository ?? createPostgresVisitPlaceRepository();

  app.register(cors, {
    origin: true,
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation !== undefined) {
      reply.status(400).send({
        error: "INVALID_QUERY",
        message: error.message,
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Une erreur interne est survenue.",
    });
  });

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  registerCityRoutes(app, cityRepository);
  registerPlaceRoutes(app, visitPlaceRepository);

  app.addHook("onClose", async () => {
    await cityRepository.close();
    await visitPlaceRepository.close();
  });

  return app;
}
