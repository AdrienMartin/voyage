import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forEachVisitPlaceFromFile } from "../lib/visitPlaces.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rawDataDirectory = path.resolve(currentDirectory, "../../data/places/raw");
const normalizedDataDirectory = path.resolve(currentDirectory, "../../data/places/normalized");

async function main() {
  await mkdir(normalizedDataDirectory, { recursive: true });

  const sourcePath = path.join(
    rawDataDirectory,
    "datatourisme-tourist-sites.jsonld",
  );
  const targetPath = path.join(
    normalizedDataDirectory,
    "visit-places.normalized.json",
  );
  const temporaryTargetPath = `${targetPath}.tmp`;
  await rm(temporaryTargetPath, { force: true });

  const outputStream = createWriteStream(temporaryTargetPath, {
    encoding: "utf8",
  });
  await waitForWriteStreamOpen(outputStream);
  const seenSourceIds = new Set<string>();
  let normalizedCount = 0;

  try {
    await writeChunk(outputStream, "[\n");
    await forEachVisitPlaceFromFile(sourcePath, async (visitPlace) => {
      if (seenSourceIds.has(visitPlace.sourceId)) {
        return;
      }

      seenSourceIds.add(visitPlace.sourceId);

      if (normalizedCount > 0) {
        await writeChunk(outputStream, ",\n");
      }

      await writeChunk(outputStream, JSON.stringify(visitPlace, null, 2));
      normalizedCount += 1;
    });
    await writeChunk(outputStream, "\n]\n");
    outputStream.end();
    await once(outputStream, "finish");
  } catch (error) {
    outputStream.destroy();
    await rm(temporaryTargetPath, { force: true });
    throw error;
  }

  await rm(targetPath, { force: true });
  await rename(temporaryTargetPath, targetPath);

  console.log(`Normalized ${normalizedCount} visit places.`);
}

async function writeChunk(
  outputStream: ReturnType<typeof createWriteStream>,
  chunk: string,
) {
  if (outputStream.write(chunk)) {
    return;
  }

  await once(outputStream, "drain");
}

async function waitForWriteStreamOpen(
  outputStream: ReturnType<typeof createWriteStream>,
) {
  if ((outputStream as { pending?: boolean }).pending === false) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handleOpen = () => {
      outputStream.off("error", handleError);
      resolve();
    };
    const handleError = (error: Error) => {
      outputStream.off("open", handleOpen);
      reject(error);
    };

    outputStream.once("open", handleOpen);
    outputStream.once("error", handleError);
  });
}

void main().catch((error) => {
  console.error("Visit place normalization failed.");
  console.error(error);
  process.exit(1);
});
