import pg from "pg";
import { getDatabaseUrl } from "../../config/env.js";
import type {
  CircuitVisitPlaceSearchParams,
  VisitPlaceRow,
} from "./placeTypes.js";

const { Pool } = pg;

export type VisitPlaceRepository = {
  findPlacesNearCircuit(
    params: CircuitVisitPlaceSearchParams,
  ): Promise<VisitPlaceRow[]>;
  close(): Promise<void>;
};

export function createPostgresVisitPlaceRepository(): VisitPlaceRepository {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  return {
    async findPlacesNearCircuit(params) {
      if (params.circuitPoints.length < 2) {
        return [];
      }

      const pointValuesSql = params.circuitPoints
        .map(
          (_point, index) =>
            `($${index * 3 + 1}::integer, $${index * 3 + 2}::double precision, $${index * 3 + 3}::double precision)`,
        )
        .join(", ");
      const pointValues = params.circuitPoints.flatMap((point, index) => [
        index,
        point.longitude,
        point.latitude,
      ]);
      const radiusParameterIndex = pointValues.length + 1;
      const limitParameterIndex = pointValues.length + 2;

      const result = await pool.query<{
        source: string;
        source_id: string;
        name: string;
        category: string;
        sub_category: string | null;
        description: string | null;
        commune: string | null;
        latitude: number;
        longitude: number;
        image_url: string | null;
        website_url: string | null;
        ranking_score: number;
        distance_to_circuit_meters: number;
      }>(
        `
          WITH circuit_points(point_order, longitude, latitude) AS (
            VALUES ${pointValuesSql}
          ),
          circuit_line AS (
            SELECT
              ST_MakeLine(
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                ORDER BY point_order
              )::geography AS geog
            FROM circuit_points
          )
          SELECT
            visit_places.source,
            visit_places.source_id,
            visit_places.name,
            visit_places.category,
            visit_places.sub_category,
            visit_places.description,
            visit_places.commune,
            visit_places.latitude,
            visit_places.longitude,
            visit_places.image_url,
            visit_places.website_url,
            visit_places.ranking_score,
            ST_Distance(visit_places.geog, circuit_line.geog) AS distance_to_circuit_meters
          FROM visit_places
          CROSS JOIN circuit_line
          WHERE ST_DWithin(
            visit_places.geog,
            circuit_line.geog,
            $${radiusParameterIndex}
          )
          ORDER BY
            visit_places.ranking_score DESC,
            distance_to_circuit_meters ASC,
            visit_places.name ASC
          LIMIT $${limitParameterIndex}
        `,
        [...pointValues, params.proximityRadiusMeters, params.limit],
      );

      return result.rows.map((row) => ({
        source: row.source,
        sourceId: row.source_id,
        name: row.name,
        category: row.category,
        subCategory: row.sub_category,
        description: row.description,
        commune: row.commune,
        latitude: row.latitude,
        longitude: row.longitude,
        imageUrl: row.image_url,
        websiteUrl: row.website_url,
        rankingScore: row.ranking_score,
        distanceToCircuitMeters: Number(row.distance_to_circuit_meters),
      }));
    },
    async close() {
      await pool.end();
    },
  };
}
