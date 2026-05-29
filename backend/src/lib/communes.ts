import { readFile } from "node:fs/promises";
import type { Buffer } from "node:buffer";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

export type CommuneRecord = {
  inseeCode: string;
  name: string;
  postalCodes: string[];
  population: number;
  latitude: number;
  longitude: number;
};

type RawRecord = Record<string, string>;

type CommuneAccumulator = {
  inseeCode: string;
  name: string;
  postalCodes: string[];
  latitudeWeightTotal: number;
  longitudeWeightTotal: number;
  coordinateWeightTotal: number;
  sourceCodes: Set<string>;
};

const POSTAL_INSEE_COLUMNS = ["Code_commune_INSEE", "code_commune_insee"] as const;
const POSTAL_NAME_COLUMNS = [
  "Nom_commune",
  "nom_commune",
  "nom_de_la_commune",
  "nom_commune_complet",
  "Nom_commune_postal",
] as const;
const POSTAL_CODE_COLUMNS = ["Code_postal", "code_postal"] as const;
const POSTAL_LATITUDE_COLUMNS = ["latitude", "Latitude"] as const;
const POSTAL_LONGITUDE_COLUMNS = ["longitude", "Longitude"] as const;

const POPULATION_CODE_COLUMNS = [
  "Code Officiel Commune / Arrondissement Municipal",
  "CODGEO",
  "COM",
  "code_commune",
] as const;

const POPULATION_VALUE_COLUMNS = [
  "Population municipale",
  "PMUN",
  "PTOT",
  "population_municipale",
] as const;

export async function buildCommunesFromFiles(input: {
  postalCsvPath: string;
  populationZipPath: string;
}) {
  const postalCsv = await readFile(input.postalCsvPath, "utf8");
  const populationZip = await readFile(input.populationZipPath);

  return buildCommunesFromContents({
    postalCsv,
    populationZip,
  });
}

export function buildCommunesFromContents(input: {
  postalCsv: string;
  populationZip: Buffer;
}) {
  const postalRows = parseCsvRecords(input.postalCsv);
  const populationRows = parsePopulationZip(input.populationZip);
  const populationByInseeCode = new Map<string, number>();
  const populationByOriginalInseeCode = new Map<string, number>();

  for (const row of populationRows) {
    const originalInseeCode = normalizeInseeCode(
      readFirst(row, POPULATION_CODE_COLUMNS),
    );
    const population = parseInteger(readFirst(row, POPULATION_VALUE_COLUMNS));
    if (originalInseeCode === null || population === null) {
      continue;
    }

    populationByOriginalInseeCode.set(originalInseeCode, population);

    const cityIdentity = normalizeCityIdentity(originalInseeCode);
    const existingPopulation = populationByInseeCode.get(cityIdentity.inseeCode) ?? 0;
    populationByInseeCode.set(cityIdentity.inseeCode, existingPopulation + population);
  }

  const groupedCommunes = new Map<string, CommuneAccumulator>();

  for (const row of postalRows) {
    const originalInseeCode = normalizeInseeCode(readFirst(row, POSTAL_INSEE_COLUMNS));
    const sourceName = readFirst(row, POSTAL_NAME_COLUMNS)?.trim();
    const postalCode = readFirst(row, POSTAL_CODE_COLUMNS)?.trim();
    const latitude = parseFloatNumber(readFirst(row, POSTAL_LATITUDE_COLUMNS));
    const longitude = parseFloatNumber(readFirst(row, POSTAL_LONGITUDE_COLUMNS));

    if (
      originalInseeCode === null ||
      sourceName === undefined ||
      sourceName === "" ||
      latitude === null ||
      longitude === null
    ) {
      continue;
    }

    const cityIdentity = normalizeCityIdentity(originalInseeCode, sourceName);
    const rawWeight = populationByOriginalInseeCode.get(originalInseeCode) ?? 1;
    const weight = rawWeight > 0 ? rawWeight : 1;
    const existing = groupedCommunes.get(cityIdentity.inseeCode);
    if (existing === undefined) {
      groupedCommunes.set(cityIdentity.inseeCode, {
        inseeCode: cityIdentity.inseeCode,
        name: cityIdentity.name,
        postalCodes: postalCode === undefined || postalCode === "" ? [] : [postalCode],
        latitudeWeightTotal: latitude * weight,
        longitudeWeightTotal: longitude * weight,
        coordinateWeightTotal: weight,
        sourceCodes: new Set([originalInseeCode]),
      });
      continue;
    }

    if (postalCode !== undefined && postalCode !== "") {
      existing.postalCodes.push(postalCode);
    }

    if (!existing.sourceCodes.has(originalInseeCode)) {
      existing.latitudeWeightTotal += latitude * weight;
      existing.longitudeWeightTotal += longitude * weight;
      existing.coordinateWeightTotal += weight;
      existing.sourceCodes.add(originalInseeCode);
    }
  }

  const communes: CommuneRecord[] = [];
  for (const commune of groupedCommunes.values()) {
    const population = populationByInseeCode.get(commune.inseeCode);
    if (population === undefined) {
      continue;
    }

    communes.push({
      inseeCode: commune.inseeCode,
      name: commune.name,
      postalCodes: [...new Set(commune.postalCodes)].sort((left, right) =>
        left.localeCompare(right),
      ),
      population,
      latitude: commune.latitudeWeightTotal / commune.coordinateWeightTotal,
      longitude: commune.longitudeWeightTotal / commune.coordinateWeightTotal,
    });
  }

  communes.sort((left, right) => left.inseeCode.localeCompare(right.inseeCode));
  return communes;
}

function parsePopulationZip(zipBuffer: Buffer) {
  const archive = new AdmZip(zipBuffer);
  const entry =
    archive.getEntry("donnees_communes.csv") ??
    archive
      .getEntries()
      .find((candidate) => candidate.entryName.toLowerCase().endsWith(".csv"));

  if (entry === undefined) {
    throw new Error("No CSV file found in the population ZIP archive.");
  }

  return parseCsvRecords(entry.getData().toString("utf8"));
}

function parseCsvRecords(content: string) {
  return parse(content, {
    bom: true,
    columns: true,
    delimiter: detectDelimiter(content),
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRecord[];
}

function detectDelimiter(content: string) {
  const [headerLine = ""] = content.split(/\r?\n/, 1);
  return headerLine.includes(";") ? ";" : ",";
}

function readFirst(row: RawRecord, candidates: readonly string[]) {
  for (const candidate of candidates) {
    const value = row[candidate];
    if (value !== undefined && value !== "") {
      return value;
    }
  }

  return undefined;
}

function normalizeInseeCode(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^[0-9AB]{4,5}$/i.test(trimmed)) {
    return null;
  }

  return trimmed.toUpperCase().padStart(5, "0");
}

function parseInteger(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatNumber(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCityIdentity(inseeCode: string, sourceName?: string) {
  for (const aggregation of MUNICIPAL_ARRONDISSEMENT_AGGREGATIONS) {
    if (aggregation.arrondissementCodes.has(inseeCode)) {
      return {
        inseeCode: aggregation.principalInseeCode,
        name: aggregation.name,
      };
    }
  }

  return {
    inseeCode,
    name: sourceName ?? inseeCode,
  };
}

const MUNICIPAL_ARRONDISSEMENT_AGGREGATIONS = [
  {
    principalInseeCode: "75056",
    name: "PARIS",
    arrondissementCodes: new Set(
      Array.from({ length: 20 }, (_, index) => `751${String(index + 1).padStart(2, "0")}`),
    ),
  },
  {
    principalInseeCode: "69123",
    name: "LYON",
    arrondissementCodes: new Set(
      Array.from({ length: 9 }, (_, index) => `6938${index + 1}`),
    ),
  },
  {
    principalInseeCode: "13055",
    name: "MARSEILLE",
    arrondissementCodes: new Set(
      Array.from({ length: 16 }, (_, index) => `132${String(index + 1).padStart(2, "0")}`),
    ),
  },
] as const;
