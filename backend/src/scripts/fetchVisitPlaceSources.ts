import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLACE_DATA_SOURCES } from "../config/placeDataSources.js";
import {
  findDatasetResourceByTitle,
  type DataGouvDataset,
} from "../lib/placeSourceCatalog.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rawDataDirectory = path.resolve(currentDirectory, "../../data/places/raw");

async function main() {
  await mkdir(rawDataDirectory, { recursive: true });

  const dataset = await fetchDatasetCatalogEntry(
    PLACE_DATA_SOURCES.dataGouvDatasetApiUrl,
  );
  const touristSitesResource = findDatasetResourceByTitle(
    dataset.resources,
    PLACE_DATA_SOURCES.datatourismeTouristSitesResourceTitle,
  );

  const targetPath = path.join(rawDataDirectory, "datatourisme-tourist-sites.jsonld");
  await downloadFile(touristSitesResource.url, targetPath);

  await writeFile(
    path.join(rawDataDirectory, "manifest.json"),
    JSON.stringify(
      {
        downloadedAt: new Date().toISOString(),
        dataset: {
          id: dataset.id,
          title: dataset.title,
          page: dataset.page ?? null,
        },
        resource: touristSitesResource,
      },
      null,
      2,
    ),
  );

  console.log(`Downloaded ${path.basename(targetPath)}`);
  console.log("Wrote manifest.json");
}

async function fetchDatasetCatalogEntry(url: string): Promise<DataGouvDataset> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset catalog entry ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DataGouvDataset;
}

async function downloadFile(url: string, targetPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(targetPath, Buffer.from(arrayBuffer));
}

void main().catch((error) => {
  console.error("Visit place source download failed.");
  console.error(error);
  process.exit(1);
});
