import "server-only";

import { unzipSync, strFromU8 } from "fflate";
import {
  INFRASTRUCTURE_LAYER_LABELS,
  isInfrastructureLayerCode,
  type InfrastructureLayerCodeId,
} from "@/lib/infrastructure-layer-config";

type Geometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "MultiPoint"; coordinates: [number, number][] }
  | { type: string; coordinates: unknown };

type FeatureProperties = Record<string, unknown> | null | undefined;

type FeatureRecord = {
  type: "Feature";
  geometry: Geometry | null;
  properties?: FeatureProperties;
  id?: string | number | null;
};

type FeatureCollectionRecord = {
  type: "FeatureCollection";
  features: FeatureRecord[];
};

export type InfrastructureLayerImportErrorCode =
  | "INVALID_ARCHIVE"
  | "MISSING_REQUIRED_FILES"
  | "MULTIPLE_DATASETS"
  | "UNSUPPORTED_LAYER"
  | "LAYER_CODE_MISMATCH"
  | "INVALID_GEOJSON"
  | "INVALID_GEOMETRY"
  | "EMPTY_LAYER"
  | "OUT_OF_BOUNDS_CRS"
  | "PARSE_ERROR"
  | "IMPORTER_UNAVAILABLE";

export class InfrastructureLayerImportError extends Error {
  constructor(
    message: string,
    public readonly code: InfrastructureLayerImportErrorCode,
    public readonly details?: Record<string, unknown>,
    public readonly status = 400
  ) {
    super(message);
    this.name = "InfrastructureLayerImportError";
  }
}

export interface InfrastructureLayerArchiveFile {
  role: "SHP" | "SHX" | "DBF" | "PRJ" | "CPG";
  originalName: string;
  archiveEntryName: string;
}

export interface InfrastructureLayerArchiveInspection {
  code: InfrastructureLayerCodeId;
  detectedCode: InfrastructureLayerCodeId | null;
  datasetName: string;
  originalCrs: string | null;
  entryNames: string[];
  archiveFiles: InfrastructureLayerArchiveFile[];
  requiredFiles: string[];
  optionalFiles: string[];
  hasCpg: boolean;
}

export interface InfrastructureLayerImportResult
  extends InfrastructureLayerArchiveInspection {
  featureCount: number;
  geometryType: "POINT";
  bbox: [number, number, number, number] | null;
  geoJsonData: FeatureCollectionRecord;
  metadata: {
    requiredFiles: string[];
    optionalFiles: string[];
    zipEntries: string[];
    hasCpg: boolean;
    detectedCode: InfrastructureLayerCodeId | null;
    archiveFiles: InfrastructureLayerArchiveFile[];
  };
}

const REQUIRED_EXTENSIONS = ["shp", "shx", "dbf", "prj"] as const;
const OPTIONAL_EXTENSIONS = ["cpg"] as const;

type RequiredExtension = (typeof REQUIRED_EXTENSIONS)[number];
type OptionalExtension = (typeof OPTIONAL_EXTENSIONS)[number];
type RecognizedExtension = RequiredExtension | OptionalExtension;

type DatasetFiles = Partial<Record<RecognizedExtension, string>>;

type ArchiveEntryMap = Record<string, Uint8Array>;

function createImportError(
  code: InfrastructureLayerImportErrorCode,
  message: string,
  details?: Record<string, unknown>,
  status = 400
) {
  return new InfrastructureLayerImportError(message, code, details, status);
}

function normalizeEntryName(name: string) {
  return name.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function getEntryBaseName(filePath: string) {
  const normalized = normalizeEntryName(filePath);
  const fileName = normalized.split("/").pop() ?? normalized;
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return null;
  return {
    baseName: fileName.slice(0, lastDot),
    extension: fileName.slice(lastDot + 1).toLowerCase(),
  };
}

function listDatasetFiles(entries: string[]) {
  const grouped = new Map<string, DatasetFiles>();

  for (const entry of entries) {
    const parsed = getEntryBaseName(entry);
    if (!parsed) continue;

    const extension = parsed.extension as RecognizedExtension;
    if (
      !REQUIRED_EXTENSIONS.includes(extension as RequiredExtension) &&
      !OPTIONAL_EXTENSIONS.includes(extension as OptionalExtension)
    ) {
      continue;
    }

    const current = grouped.get(parsed.baseName) ?? {};
    current[extension] = entry;
    grouped.set(parsed.baseName, current);
  }

  return grouped;
}

function resolveDataset(entries: string[]) {
  const grouped = listDatasetFiles(entries);
  const completeDatasets: Array<{ baseName: string; files: DatasetFiles }> = [];
  let bestPartial:
    | { baseName: string; files: DatasetFiles; missing: RequiredExtension[] }
    | null = null;

  for (const [baseName, files] of grouped.entries()) {
    const missing = REQUIRED_EXTENSIONS.filter((extension) => !files[extension]);
    if (missing.length === 0) {
      completeDatasets.push({ baseName, files });
      continue;
    }

    const currentBestMissingCount = bestPartial
      ? REQUIRED_EXTENSIONS.filter((extension) => !bestPartial!.files[extension]).length
      : Number.POSITIVE_INFINITY;

    if (!bestPartial || missing.length < currentBestMissingCount) {
      bestPartial = { baseName, files, missing };
    }
  }

  if (completeDatasets.length === 0) {
    const missingList = bestPartial?.missing ?? [...REQUIRED_EXTENSIONS];
    throw createImportError(
      "MISSING_REQUIRED_FILES",
      `Upload incompleto. Faltam arquivo(s) obrigatório(s): ${missingList
        .map((extension) => `.${extension}`)
        .join(", ")}.`,
      {
        missingExtensions: missingList,
        requiredExtensions: [...REQUIRED_EXTENSIONS],
        datasetName: bestPartial?.baseName ?? null,
      }
    );
  }

  if (completeDatasets.length > 1) {
    throw createImportError(
      "MULTIPLE_DATASETS",
      "O ZIP contém mais de um shapefile completo. Envie apenas um conjunto por upload.",
      {
        datasetNames: completeDatasets.map((dataset) => dataset.baseName),
      }
    );
  }

  return completeDatasets[0];
}

function mapArchiveFiles(files: DatasetFiles): InfrastructureLayerArchiveFile[] {
  return [...REQUIRED_EXTENSIONS, ...OPTIONAL_EXTENSIONS]
    .map((extension) => {
      const archiveEntryName = files[extension];
      if (!archiveEntryName) return null;
      const parsed = getEntryBaseName(archiveEntryName);
      return {
        role: extension.toUpperCase() as InfrastructureLayerArchiveFile["role"],
        originalName: parsed ? `${parsed.baseName}.${extension}` : archiveEntryName,
        archiveEntryName,
      } satisfies InfrastructureLayerArchiveFile;
    })
    .filter((file): file is InfrastructureLayerArchiveFile => file !== null);
}

function inferInfrastructureLayerCode(entryNames: string[], datasetName: string) {
  const haystack = [datasetName, ...entryNames]
    .join(" ")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ");

  const detected = new Set<InfrastructureLayerCodeId>();
  if (/\bPONNOT\b/.test(haystack)) {
    detected.add("PONNOT");
  }
  if (/\bPONT\s*ILUM\b/.test(haystack) || /\bPONTILUM\b/.test(haystack)) {
    detected.add("PONT_ILUM");
  }

  if (detected.size === 0) return null;
  if (detected.size === 1) return Array.from(detected)[0];

  throw createImportError(
    "UNSUPPORTED_LAYER",
    "Não foi possível identificar de forma unívoca a camada técnica enviada. Use um pacote contendo apenas PONNOT ou PONT_ILUM.",
    {
      matchedCodes: Array.from(detected),
      datasetName,
    }
  );
}

function readArchiveEntries(buffer: Buffer) {
  try {
    return unzipSync(new Uint8Array(buffer));
  } catch (error) {
    console.error("[INFRASTRUCTURE_LAYER_ARCHIVE_ERROR]", error);
    throw createImportError(
      "INVALID_ARCHIVE",
      "O arquivo ZIP está corrompido ou não pôde ser aberto.",
      undefined,
      400
    );
  }
}

function toArrayBuffer(buffer: Buffer) {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

function toFeatureCollection(raw: unknown): FeatureCollectionRecord {
  if (Array.isArray(raw)) {
    if (raw.length !== 1) {
      throw createImportError(
        "MULTIPLE_DATASETS",
        "O arquivo ZIP gerou múltiplas camadas. Envie apenas um shapefile por upload.",
        {
          generatedLayers: raw.length,
        }
      );
    }
    return toFeatureCollection(raw[0]);
  }

  if (
    raw &&
    typeof raw === "object" &&
    (raw as { type?: string }).type === "FeatureCollection" &&
    Array.isArray((raw as { features?: unknown[] }).features)
  ) {
    return raw as FeatureCollectionRecord;
  }

  throw createImportError(
    "INVALID_GEOJSON",
    "Não foi possível interpretar o shapefile como GeoJSON válido."
  );
}

function isFiniteLngLat(coordinates: unknown): coordinates is [number, number] {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  );
}

function explodeMultiPointFeatures(
  featureCollection: FeatureCollectionRecord
): FeatureCollectionRecord {
  const exploded: FeatureRecord[] = [];

  for (const feature of featureCollection.features) {
    if (!feature.geometry) {
      throw createImportError(
        "INVALID_GEOMETRY",
        "O shapefile contém geometria vazia ou inválida."
      );
    }

    if (feature.geometry.type === "Point") {
      if (!isFiniteLngLat(feature.geometry.coordinates)) {
        throw createImportError(
          "INVALID_GEOMETRY",
          "O shapefile contém ponto com coordenadas inválidas.",
          {
            geometryType: feature.geometry.type,
          }
        );
      }
      exploded.push(feature);
      continue;
    }

    if (feature.geometry.type === "MultiPoint") {
      if (!Array.isArray(feature.geometry.coordinates)) {
        throw createImportError(
          "INVALID_GEOMETRY",
          "O shapefile contém multiponto com coordenadas inválidas.",
          {
            geometryType: feature.geometry.type,
          }
        );
      }

      for (const coordinates of feature.geometry.coordinates) {
        if (!isFiniteLngLat(coordinates)) {
          throw createImportError(
            "INVALID_GEOMETRY",
            "O shapefile contém multiponto com coordenadas inválidas.",
            {
              geometryType: feature.geometry.type,
            }
          );
        }
        exploded.push({
          ...feature,
          geometry: {
            type: "Point",
            coordinates,
          },
        });
      }
      continue;
    }

    throw createImportError(
      "INVALID_GEOMETRY",
      "A camada enviada possui geometria incompatível. Para este fluxo, use apenas feições pontuais.",
      {
        geometryType: feature.geometry.type,
      }
    );
  }

  if (exploded.length === 0) {
    throw createImportError(
      "EMPTY_LAYER",
      "O shapefile não possui feições válidas para publicar."
    );
  }

  return {
    type: "FeatureCollection",
    features: exploded,
  };
}

function detectOutOfBoundsCoordinates(
  featureCollection: FeatureCollectionRecord
): boolean {
  return featureCollection.features.some((feature) => {
    const coordinates = feature.geometry?.coordinates;
    return (
      isFiniteLngLat(coordinates) &&
      (Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90)
    );
  });
}

function computeBbox(
  featureCollection: FeatureCollectionRecord
): [number, number, number, number] | null {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const feature of featureCollection.features) {
    const coordinates = feature.geometry?.coordinates;
    if (!isFiniteLngLat(coordinates)) continue;
    minLng = Math.min(minLng, coordinates[0]);
    maxLng = Math.max(maxLng, coordinates[0]);
    minLat = Math.min(minLat, coordinates[1]);
    maxLat = Math.max(maxLat, coordinates[1]);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export function inspectInfrastructureLayerArchive(input: {
  buffer: Buffer;
  expectedCode?: InfrastructureLayerCodeId | null;
}): InfrastructureLayerArchiveInspection {
  const archiveEntries = readArchiveEntries(input.buffer);
  const entryNames = Object.keys(archiveEntries)
    .map(normalizeEntryName)
    .filter((entry) => entry.length > 0 && !entry.endsWith("/"));

  if (entryNames.length === 0) {
    throw createImportError(
      "INVALID_ARCHIVE",
      "O arquivo ZIP está vazio ou corrompido."
    );
  }

  const dataset = resolveDataset(entryNames);
  const prjEntry = dataset.files.prj;
  const cpgEntry = dataset.files.cpg;
  const prjContents = prjEntry ? strFromU8(archiveEntries[prjEntry]).trim() : "";
  const detectedCode = inferInfrastructureLayerCode(entryNames, dataset.baseName);
  const resolvedCode = input.expectedCode ?? detectedCode;

  if (!resolvedCode || !isInfrastructureLayerCode(resolvedCode)) {
    throw createImportError(
      "UNSUPPORTED_LAYER",
      "Não foi possível identificar se a camada enviada é PONNOT ou PONT_ILUM.",
      {
        datasetName: dataset.baseName,
        entryNames,
        detectedCode,
      }
    );
  }

  if (input.expectedCode && detectedCode && input.expectedCode !== detectedCode) {
    throw createImportError(
      "LAYER_CODE_MISMATCH",
      `O ZIP enviado parece ser ${detectedCode}, mas o upload foi iniciado como ${input.expectedCode}.`,
      {
        expectedCode: input.expectedCode,
        detectedCode,
        datasetName: dataset.baseName,
      }
    );
  }

  return {
    code: resolvedCode,
    detectedCode,
    datasetName: dataset.baseName,
    originalCrs: prjContents || null,
    entryNames,
    archiveFiles: mapArchiveFiles(dataset.files),
    requiredFiles: REQUIRED_EXTENSIONS.map((extension) => `.${extension}`),
    optionalFiles: OPTIONAL_EXTENSIONS.map((extension) => `.${extension}`),
    hasCpg: Boolean(cpgEntry),
  };
}

export async function importInfrastructureLayerFromZip(input: {
  buffer: Buffer;
  expectedCode?: InfrastructureLayerCodeId | null;
  inspection?: InfrastructureLayerArchiveInspection;
}) {
  const inspection =
    input.inspection ??
    inspectInfrastructureLayerArchive({
      buffer: input.buffer,
      expectedCode: input.expectedCode,
    });

  let shpjs: (input: ArrayBuffer) => Promise<unknown>;
  try {
    shpjs = (await import("shpjs")).default;
  } catch {
    throw createImportError(
      "IMPORTER_UNAVAILABLE",
      "Não foi possível carregar o processador de shapefile.",
      undefined,
      500
    );
  }

  let parsed: unknown;
  try {
    parsed = await shpjs(toArrayBuffer(input.buffer));
  } catch (error) {
    console.error("[INFRASTRUCTURE_LAYER_PARSE_ERROR]", error);
    throw createImportError(
      "PARSE_ERROR",
      `Falha ao processar ${INFRASTRUCTURE_LAYER_LABELS[inspection.code]}. Verifique se o shapefile não está corrompido.`,
      {
        code: inspection.code,
        datasetName: inspection.datasetName,
      }
    );
  }

  const featureCollection = explodeMultiPointFeatures(toFeatureCollection(parsed));

  if (detectOutOfBoundsCoordinates(featureCollection)) {
    throw createImportError(
      "OUT_OF_BOUNDS_CRS",
      "As coordenadas publicadas ficaram fora de EPSG:4326. Revise o arquivo .prj e reprojete o shapefile antes do upload.",
      {
        datasetName: inspection.datasetName,
        originalCrs: inspection.originalCrs,
      }
    );
  }

  return {
    ...inspection,
    featureCount: featureCollection.features.length,
    geometryType: "POINT" as const,
    bbox: computeBbox(featureCollection),
    geoJsonData: featureCollection,
    metadata: {
      requiredFiles: inspection.requiredFiles,
      optionalFiles: inspection.optionalFiles,
      zipEntries: inspection.entryNames,
      hasCpg: inspection.hasCpg,
      detectedCode: inspection.detectedCode,
      archiveFiles: inspection.archiveFiles,
    },
  } satisfies InfrastructureLayerImportResult;
}
