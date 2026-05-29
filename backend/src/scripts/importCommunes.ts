import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getDatabaseUrl } from "../config/env.js";
import { buildCommunesFromFiles, type CommuneRecord } from "../lib/communes.js";

const { Client } = pg;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rawDataDirectory = path.resolve(currentDirectory, "../../data/raw");

async function main() {
  const communes = await buildCommunesFromFiles({
    postalCsvPath: path.join(rawDataDirectory, "base-officielle-codes-postaux.csv"),
    populationZipPath: path.join(rawDataDirectory, "population-reference-2023.zip"),
  });

  const client = new Client({
    connectionString: getDatabaseUrl(),
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE communes RESTART IDENTITY");

    for (const batch of createBatches(communes, 500)) {
      await insertBatch(client, batch);
    }

    await client.query("COMMIT");
    console.log(`Imported ${communes.length} communes.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function insertBatch(client: pg.Client, communes: CommuneRecord[]) {
  const values: unknown[] = [];
  const placeholders = communes.map((commune, index) => {
    const baseIndex = index * 6;
    values.push(
      commune.inseeCode,
      commune.name,
      commune.postalCodes,
      commune.population,
      commune.latitude,
      commune.longitude,
    );

    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, ST_SetSRID(ST_MakePoint($${baseIndex + 6}, $${baseIndex + 5}), 4326))`;
  });

  await client.query(
    `
      INSERT INTO communes (
        insee_code,
        name,
        postal_codes,
        population,
        latitude,
        longitude,
        geom
      )
      VALUES ${placeholders.join(", ")}
    `,
    values,
  );
}

function createBatches<T>(items: T[], batchSize: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

void main().catch((error) => {
  console.error("Commune import failed.");
  console.error(error);
  process.exit(1);
});

