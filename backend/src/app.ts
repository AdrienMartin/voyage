import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import {
  createPostgresCityRepository,
  type CityRepository,
} from "./features/cities/cityRepository.js";
import { registerCityRoutes } from "./features/cities/cityRoutes.js";

type BuildAppOptions = {
  cityRepository?: CityRepository;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });
  const cityRepository =
    options.cityRepository ?? createPostgresCityRepository();

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

  app.addHook("onClose", async () => {
    await cityRepository.close();
  });

  return app;
}
