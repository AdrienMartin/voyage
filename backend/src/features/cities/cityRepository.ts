import pg from "pg";
import { getDatabaseUrl } from "../../config/env.js";
import { getDepartmentCodesForRegionCodes } from "./administrativeCodes.js";
import type {
  AdministrativeCitySearchParams,
  CityRow,
  CitySearchParams,
} from "./cityTypes.js";

const { Pool } = pg;
const DISTANCE_POINT_SQL = "ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography";
const DEPARTMENT_CODE_SQL = `
  CASE
    WHEN insee_code ~ '^(2A|2B)' THEN substring(insee_code FROM 1 FOR 2)
    WHEN insee_code ~ '^(97|98)' THEN substring(insee_code FROM 1 FOR 3)
    ELSE substring(insee_code FROM 1 FOR 2)
  END
`;

export type CityRepository = {
  findCitiesWithinRadius(params: CitySearchParams): Promise<CityRow[]>;
  findCitiesByAdministrativeAreas(
    params: AdministrativeCitySearchParams,
  ): Promise<CityRow[]>;
  close(): Promise<void>;
};

export function createPostgresCityRepository(): CityRepository {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return {
    async findCitiesWithinRadius(params) {
      const result = await pool.query<{
        insee_code: string;
        name: string;
        postal_codes: string[];
        population: number;
        latitude: number;
        longitude: number;
        distance_meters: number;
      }>(
        `
          SELECT
            insee_code,
            name,
            postal_codes,
            population,
            latitude,
            longitude,
            ST_Distance(
              geog,
              ${DISTANCE_POINT_SQL}
            ) AS distance_meters
          FROM communes
          WHERE ST_DWithin(
            geog,
            ${DISTANCE_POINT_SQL},
            $3
          )
          ORDER BY population DESC, name ASC
          LIMIT $4
        `,
        [params.lon, params.lat, params.radius, params.limit],
      );

      return result.rows.map((row) => mapCityRow(row, Number(row.distance_meters)));
    },
    async findCitiesByAdministrativeAreas(params) {
      const departmentCodes = params.departmentCodes;
      const regionDepartmentCodes = getDepartmentCodesForRegionCodes(params.regionCodes);
      const allowedDepartmentCodes = [...new Set([...departmentCodes, ...regionDepartmentCodes])];

      if (allowedDepartmentCodes.length === 0) {
        return [];
      }

      const result = await pool.query<{
        insee_code: string;
        name: string;
        postal_codes: string[];
        population: number;
        latitude: number;
        longitude: number;
      }>(
        `
          SELECT
            insee_code,
            name,
            postal_codes,
            population,
            latitude,
            longitude
          FROM communes
          WHERE (${DEPARTMENT_CODE_SQL}) = ANY($1::text[])
          ORDER BY population DESC, name ASC
          LIMIT $2
        `,
        [allowedDepartmentCodes, params.limit],
      );

      return result.rows.map((row) => mapCityRow(row, 0));
    },
    async close() {
      await pool.end();
    },
  };
}

function mapCityRow(
  row: {
    insee_code: string;
    name: string;
    postal_codes: string[];
    population: number;
    latitude: number;
    longitude: number;
  },
  distanceMeters: number,
): CityRow {
  return {
    inseeCode: row.insee_code,
    name: row.name,
    postalCodes: row.postal_codes,
    population: row.population,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceMeters,
  };
}
