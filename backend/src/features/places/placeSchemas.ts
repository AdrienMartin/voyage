import {
  DEFAULT_CIRCUIT_PLACE_LIMIT,
  DEFAULT_CIRCUIT_PLACE_RADIUS_METERS,
  MAX_CIRCUIT_PLACE_LIMIT,
  MAX_CIRCUIT_PLACE_RADIUS_METERS,
} from "./placeConstants.js";

export const circuitPlacesBodySchema = {
  type: "object",
  required: ["circuitPoints"],
  additionalProperties: false,
  properties: {
    circuitPoints: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: ["latitude", "longitude"],
        additionalProperties: false,
        properties: {
          latitude: {
            type: "number",
            minimum: -90,
            maximum: 90,
          },
          longitude: {
            type: "number",
            minimum: -180,
            maximum: 180,
          },
        },
      },
    },
    proximityRadiusMeters: {
      type: "integer",
      minimum: 1_000,
      maximum: MAX_CIRCUIT_PLACE_RADIUS_METERS,
      default: DEFAULT_CIRCUIT_PLACE_RADIUS_METERS,
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAX_CIRCUIT_PLACE_LIMIT,
      default: DEFAULT_CIRCUIT_PLACE_LIMIT,
    },
  },
} as const;
