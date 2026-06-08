import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getDatabaseUrl } from "../config/env.js";
import {
  forEachVisitPlaceFromFile,
  type VisitPlaceRecord,
} from "../lib/visitPlaces.js";

const { Client } = pg;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rawDataDirectory = path.resolve(currentDirectory, "../../data/places/raw");
const sourcePath = path.join(rawDataDirectory, "datatourisme-tourist-sites.jsonld");
const BATCH_SIZE = 500;

async function main() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE visit_places RESTART IDENTITY");

    let batch: VisitPlaceRecord[] = [];
    let importedCount = 0;
    const seenSourceIds = new Set<string>();

    await forEachVisitPlaceFromFile(sourcePath, async (visitPlace) => {
      if (seenSourceIds.has(visitPlace.sourceId)) {
        return;
      }

      seenSourceIds.add(visitPlace.sourceId);
      batch.push(visitPlace);

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch);
        importedCount += batch.length;
        batch = [];
      }
    });

    if (batch.length > 0) {
      await insertBatch(client, batch);
      importedCount += batch.length;
    }

    await client.query("COMMIT");
    console.log(`Imported ${importedCount} visit places.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function insertBatch(client: pg.Client, visitPlaces: VisitPlaceRecord[]) {
  const values: unknown[] = [];
  const placeholders = visitPlaces.map((visitPlace, index) => {
    const baseIndex = index * 13;
    values.push(
      visitPlace.source,
      visitPlace.sourceId,
      visitPlace.name,
      visitPlace.category,
      visitPlace.subCategory,
      visitPlace.description,
      visitPlace.commune,
      visitPlace.imageUrl,
      visitPlace.websiteUrl,
      visitPlace.rankingScore,
      visitPlace.latitude,
      visitPlace.longitude,
      visitPlace.sourceUpdatedAt,
    );

    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, ST_SetSRID(ST_MakePoint($${baseIndex + 12}, $${baseIndex + 11}), 4326), $${baseIndex + 13})`;
  });

  await client.query(
    `
      INSERT INTO visit_places (
        source,
        source_id,
        name,
        category,
        sub_category,
        description,
        commune,
        image_url,
        website_url,
        ranking_score,
        latitude,
        longitude,
        geom,
        source_updated_at
      )
      VALUES ${placeholders.join(", ")}
    `,
    values,
  );
}

void main().catch((error) => {
  console.error("Visit place import failed.");
  console.error(error);
  process.exit(1);
});
