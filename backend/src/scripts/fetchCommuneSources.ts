import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMUNE_DATA_SOURCES } from "../config/communeDataSources.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rawDataDirectory = path.resolve(currentDirectory, "../../data/raw");

async function main() {
  await mkdir(rawDataDirectory, { recursive: true });

  await downloadFile(
    COMMUNE_DATA_SOURCES.postalCentroidsCsvUrl,
    path.join(rawDataDirectory, "base-officielle-codes-postaux.csv"),
  );
  await downloadFile(
    COMMUNE_DATA_SOURCES.populationZipUrl,
    path.join(rawDataDirectory, "population-reference-2023.zip"),
  );
}

async function downloadFile(url: string, targetPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(targetPath, Buffer.from(arrayBuffer));
  console.log(`Downloaded ${path.basename(targetPath)}`);
}

void main().catch((error) => {
  console.error("Commune source download failed.");
  console.error(error);
  process.exit(1);
});

