import { createReadStream } from "node:fs";
import { open, readFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { computeVisitPlaceRankingScore } from "./visitPlaceRanking.js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue;
};

export type VisitPlaceRecord = {
  source: "DATAtourisme";
  sourceId: string;
  name: string;
  category: string;
  subCategory: string | null;
  description: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  websiteUrl: string | null;
  rankingScore: number;
  sourceUpdatedAt: string | null;
};

const DATATOURISME_SOURCE = "DATAtourisme";
const MAX_DESCRIPTION_LENGTH = 500;
const IGNORED_TYPE_LABELS = new Set([
  "Thing",
  "Place",
  "PointOfInterest",
  "Agent",
  "Resource",
  "Concept",
]);

export async function buildVisitPlacesFromFile(jsonLdPath: string) {
  const jsonLd = await readFile(jsonLdPath, "utf8");
  return buildVisitPlacesFromContents(jsonLd);
}

export async function forEachVisitPlaceFromFile(
  jsonLdPath: string,
  onVisitPlace: (visitPlace: VisitPlaceRecord) => void | Promise<void>,
) {
  const readStream = await createVisitPlacesTextStream(jsonLdPath);
  let graphSearchBuffer = "";
  let hasEnteredGraphArray = false;
  let hasClosedGraphArray = false;
  let isCollectingObject = false;
  let objectBuffer = "";
  let objectBraceDepth = 0;
  let isInsideString = false;
  let isEscaped = false;

  for await (const chunk of readStream) {
    if (hasClosedGraphArray) {
      break;
    }

    let contentToProcess = chunk;

    if (!hasEnteredGraphArray) {
      graphSearchBuffer += chunk;
      const graphMatch = /"@graph"\s*:\s*\[/u.exec(graphSearchBuffer);
      if (graphMatch === null) {
        graphSearchBuffer = graphSearchBuffer.slice(-32);
        continue;
      }

      hasEnteredGraphArray = true;
      contentToProcess = graphSearchBuffer.slice(
        graphMatch.index + graphMatch[0].length,
      );
      graphSearchBuffer = "";
    }

    for (const character of contentToProcess) {
      if (isCollectingObject) {
        objectBuffer += character;

        if (isEscaped) {
          isEscaped = false;
          continue;
        }

        if (character === "\\") {
          isEscaped = true;
          continue;
        }

        if (character === "\"") {
          isInsideString = !isInsideString;
          continue;
        }

        if (isInsideString) {
          continue;
        }

        if (character === "{") {
          objectBraceDepth += 1;
          continue;
        }

        if (character === "}") {
          objectBraceDepth -= 1;

          if (objectBraceDepth === 0) {
            isCollectingObject = false;
            const parsedNode = JSON.parse(objectBuffer) as JsonValue;
            objectBuffer = "";

            if (isJsonObject(parsedNode)) {
              const visitPlace = normalizeDatatourismePlace(parsedNode);
              if (visitPlace !== null) {
                await onVisitPlace(visitPlace);
              }
            }
          }
        }

        continue;
      }

      if (character === "{") {
        isCollectingObject = true;
        objectBuffer = "{";
        objectBraceDepth = 1;
        isInsideString = false;
        isEscaped = false;
        continue;
      }

      if (character === "]") {
        hasClosedGraphArray = true;
        break;
      }
    }
  }

  if (!hasEnteredGraphArray) {
    throw new Error("Unsupported DATAtourisme payload format: missing @graph array.");
  }

  if (isCollectingObject) {
    throw new Error("Unsupported DATAtourisme payload format: truncated graph object.");
  }
}

async function createVisitPlacesTextStream(jsonLdPath: string) {
  const fileHandle = await open(jsonLdPath, "r");
  const magicBytes = Buffer.alloc(2);

  try {
    await fileHandle.read(magicBytes, 0, magicBytes.length, 0);
  } finally {
    await fileHandle.close();
  }

  const fileStream = createReadStream(jsonLdPath);
  if (magicBytes[0] === 0x1f && magicBytes[1] === 0x8b) {
    const gunzipStream = createGunzip();
    fileStream.pipe(gunzipStream);
    gunzipStream.setEncoding("utf8");
    return gunzipStream;
  }

  fileStream.setEncoding("utf8");
  return fileStream;
}

export function buildVisitPlacesFromContents(jsonLd: string) {
  const parsed = JSON.parse(jsonLd) as JsonValue;
  const nodes = extractGraphNodes(parsed);
  const visitPlaces = new Map<string, VisitPlaceRecord>();

  for (const node of nodes) {
    const visitPlace = normalizeDatatourismePlace(node);
    if (visitPlace === null) {
      continue;
    }

    visitPlaces.set(visitPlace.sourceId, visitPlace);
  }

  return [...visitPlaces.values()].sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId),
  );
}

export function normalizeDatatourismePlace(node: JsonObject): VisitPlaceRecord | null {
  const sourceId = readFirstString(node, ["@id", "dc:identifier", "identifier"]);
  const name = readFirstString(node, [
    "rdfs:label",
    "schema:name",
    "name",
    "nom",
  ]);
  const coordinates = readCoordinates(node);

  if (sourceId === null || name === null || coordinates === null) {
    return null;
  }

  const typeLabels = readTypeLabels(node);
  const category = normalizeCategory(typeLabels[0] ?? "Lieu touristique");
  const subCategory =
    typeLabels.length > 1 ? normalizeCategory(typeLabels[1]) : null;

  const description = normalizeDescription(
    readFirstString(node, [
      "schema:description",
      "description",
      "dc:description",
      "rdfs:comment",
    ]),
  );
  const commune = normalizeOptionalString(readLocality(node));
  const imageUrl = normalizeOptionalString(
    readFirstUrl(node, ["schema:image", "foaf:depiction", "hasRepresentation"]),
  );
  const websiteUrl = normalizeOptionalString(
    readFirstUrl(node, ["schema:url", "foaf:homepage", "hasWebsite"]),
  );
  const sourceUpdatedAt = normalizeOptionalString(
    readFirstString(node, [
      "schema:dateModified",
      "modified",
      "dct:modified",
    ]),
  );

  return {
    source: DATATOURISME_SOURCE,
    sourceId,
    name: normalizeWhitespace(name),
    category,
    subCategory,
    description,
    commune,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    imageUrl,
    websiteUrl,
    rankingScore: computeVisitPlaceRankingScore({
      category,
      subCategory,
      description,
      commune,
      imageUrl,
      websiteUrl,
      sourceUpdatedAt,
    }),
    sourceUpdatedAt,
  };
}

function extractGraphNodes(value: JsonValue) {
  if (Array.isArray(value)) {
    return value.filter(isJsonObject);
  }

  if (!isJsonObject(value)) {
    throw new Error("Unsupported DATAtourisme payload format.");
  }

  const graph = value["@graph"];
  if (Array.isArray(graph)) {
    return graph.filter(isJsonObject);
  }

  return [value];
}

function readCoordinates(node: JsonObject) {
  const geoCandidates = findNestedObjectsByKey(node, "schema:geo");
  for (const geoCandidate of geoCandidates) {
    const latitude = readFirstNumber(geoCandidate, [
      "schema:latitude",
      "latitude",
    ]);
    const longitude = readFirstNumber(geoCandidate, [
      "schema:longitude",
      "longitude",
    ]);

    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
      };
    }
  }

  const latitude = findFirstNumberByKey(node, ["schema:latitude", "latitude"]);
  const longitude = findFirstNumberByKey(node, ["schema:longitude", "longitude"]);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function readTypeLabels(node: JsonObject) {
  const rawType = node["@type"];
  const types = Array.isArray(rawType) ? rawType : rawType === undefined ? [] : [rawType];

  return types
    .filter((type): type is string => typeof type === "string" && type.trim() !== "")
    .map(extractTypeLabel)
    .filter((typeLabel) => !IGNORED_TYPE_LABELS.has(typeLabel));
}

function extractTypeLabel(typeValue: string) {
  const hashIndex = typeValue.lastIndexOf("#");
  const slashIndex = typeValue.lastIndexOf("/");
  const colonIndex = typeValue.lastIndexOf(":");
  const separatorIndex = Math.max(hashIndex, slashIndex, colonIndex);
  return separatorIndex === -1 ? typeValue : typeValue.slice(separatorIndex + 1);
}

function normalizeCategory(typeLabel: string) {
  const normalizedTypeLabel = typeLabel.trim();
  const withSpaces = normalizedTypeLabel
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function readLocality(node: JsonObject) {
  const addressCandidates = findNestedObjectsByKey(node, "schema:address");
  for (const addressCandidate of addressCandidates) {
    const locality = readFirstString(addressCandidate, [
      "schema:addressLocality",
      "addressLocality",
      "commune",
    ]);

    if (locality !== null) {
      return locality;
    }
  }

  return findFirstStringByKey(node, [
    "schema:addressLocality",
    "addressLocality",
    "commune",
  ]);
}

function readFirstUrl(node: JsonObject, candidateKeys: string[]) {
  for (const candidateKey of candidateKeys) {
    const value = node[candidateKey];
    const normalized = normalizeUrlValue(value);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function normalizeUrlValue(value: JsonValue | undefined): string | null {
  if (typeof value === "string") {
    return isHttpUrl(value) ? value.trim() : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeUrlValue(item);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  }

  if (isJsonObject(value)) {
    const directUrl = readFirstString(value, ["@id", "url", "schema:url"]);
    return directUrl !== null && isHttpUrl(directUrl) ? directUrl.trim() : null;
  }

  return null;
}

function readFirstString(node: JsonObject, candidateKeys: string[]) {
  for (const candidateKey of candidateKeys) {
    const value = node[candidateKey];
    const normalized = normalizeStringValue(value);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function normalizeStringValue(value: JsonValue | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeStringValue(item);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  }

  if (isJsonObject(value)) {
    return readFirstString(value, ["@value", "@id", "value", "label"]);
  }

  return null;
}

function readFirstNumber(node: JsonObject, candidateKeys: string[]) {
  for (const candidateKey of candidateKeys) {
    const value = node[candidateKey];
    const normalized = normalizeNumberValue(value);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function normalizeNumberValue(value: JsonValue | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeNumberValue(item);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  }

  if (isJsonObject(value)) {
    return readFirstNumber(value, ["@value", "value"]);
  }

  return null;
}

function findFirstStringByKey(node: JsonObject, candidateKeys: string[]) {
  for (const candidateKey of candidateKeys) {
    const matchingValues = findNestedValuesByKey(node, candidateKey);
    for (const matchingValue of matchingValues) {
      const normalized = normalizeStringValue(matchingValue);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
}

function findFirstNumberByKey(node: JsonObject, candidateKeys: string[]) {
  for (const candidateKey of candidateKeys) {
    const matchingValues = findNestedValuesByKey(node, candidateKey);
    for (const matchingValue of matchingValues) {
      const normalized = normalizeNumberValue(matchingValue);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
}

function findNestedObjectsByKey(node: JsonObject, key: string): JsonObject[] {
  return findNestedValuesByKey(node, key).filter(isJsonObject);
}

function findNestedValuesByKey(value: JsonValue, key: string): JsonValue[] {
  const results: JsonValue[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      results.push(...findNestedValuesByKey(item, key));
    }

    return results;
  }

  if (!isJsonObject(value)) {
    return results;
  }

  for (const [currentKey, currentValue] of Object.entries(value)) {
    if (currentKey === key) {
      results.push(currentValue);
    }

    results.push(...findNestedValuesByKey(currentValue, key));
  }

  return results;
}

function normalizeDescription(description: string | null) {
  if (description === null) {
    return null;
  }

  const compactedDescription = normalizeWhitespace(description);
  if (compactedDescription === "") {
    return null;
  }

  if (compactedDescription.length <= MAX_DESCRIPTION_LENGTH) {
    return compactedDescription;
  }

  return `${compactedDescription.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

function normalizeOptionalString(value: string | null) {
  return value === null ? null : normalizeWhitespace(value);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
