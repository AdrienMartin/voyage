import {
  DEFAULT_CITY_LIMIT,
  MAX_CITY_LIMIT,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
} from "./cityConstants.js";

export const cityQuerySchema = {
  type: "object",
  required: ["lat", "lon", "radius"],
  additionalProperties: false,
  properties: {
    lat: {
      type: "number",
      minimum: -90,
      maximum: 90,
    },
    lon: {
      type: "number",
      minimum: -180,
      maximum: 180,
    },
    radius: {
      type: "number",
      minimum: MIN_RADIUS_METERS,
      maximum: MAX_RADIUS_METERS,
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAX_CITY_LIMIT,
      default: DEFAULT_CITY_LIMIT,
    },
  },
} as const;

export const cityAdministrativeQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    departmentCodes: {
      type: "string",
      minLength: 1,
    },
    regionCodes: {
      type: "string",
      minLength: 1,
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: MAX_CITY_LIMIT,
      default: DEFAULT_CITY_LIMIT,
    },
  },
  anyOf: [{ required: ["departmentCodes"] }, { required: ["regionCodes"] }],
} as const;
