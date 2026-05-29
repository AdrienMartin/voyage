import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getDatabaseUrl } from "../config/env.js";

const { Client } = pg;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(
  currentDirectory,
  "../../db/migrations",
);

async function main() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await ensureMigrationsTable(client);

    const migrations = await loadMigrationFiles();
    for (const migration of migrations) {
      const alreadyApplied = await client.query<{ version: string }>(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [migration.version],
      );

      if (alreadyApplied.rowCount !== 0) {
        continue;
      }

      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1)",
        [migration.version],
      );
      console.log(`Applied migration ${migration.version}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function loadMigrationFiles() {
  const entries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  });

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(migrationsDirectory, fileName);
      const sql = await readFile(filePath, "utf8");

      return {
        version: fileName,
        sql,
      };
    }),
  );
}

void main().catch((error) => {
  console.error("Migration failed.");
  console.error(error);
  process.exit(1);
});
