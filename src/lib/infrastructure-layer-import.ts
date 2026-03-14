import "server-only";

import { unzipSync, strFromU8 } from "fflate";
import {
  INFRASTRUCTURE_LAYER_LABELS,
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

export interface InfrastructureLayerImportResult {
  code: InfrastructureLayerCodeId;
  datasetName: string;
  originalCrs: string | null;
  featureCount: number;
  geometryType: "POINT";
  bbox: [number, number, number, number] | null;
  geoJsonData: FeatureCollectionRecord;
  metadata: {
    requiredFiles: string[];
    optionalFiles: string[];
    zipEntries: string[];
    hasCpg: boolean;
  };
}

const REQUIRED_EXTENSIONS = ["shp", "shx", "dbf", "prj"] as const;
const OPTIONAL_EXTENSIONS = ["cpg"] as const;

type RequiredExtension = (typeof REQUIRED_EXTENSIONS)[number];
type OptionalExtension = (typeof OPTIONAL_EXTENSIONS)[number];
type RecognizedExtension = RequiredExtension | OptionalExtension;

type DatasetFiles = Partial<Record<RecognizedExtension, string>>;

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

    const bestPartialFiles = bestPartial?.files;
    const currentBestMissingCount = bestPartialFiles
      ? REQUIRED_EXTENSIONS.filter((extension) => !bestPartialFiles[extension])
          .length
      : Number.POSITIVE_INFINITY;

    if (
      !bestPartial ||
      missing.length < currentBestMissingCount
    ) {
      bestPartial = { baseName, files, missing };
    }
  }

  if (completeDatasets.length === 0) {
    const missingList = bestPartial?.missing ?? [...REQUIRED_EXTENSIONS];
    throw new Error(
      `Upload incompleto. Faltam arquivo(s) obrigatório(s): ${missingList
        .map((extension) => `.${extension}`)
        .join(", ")}.`
    );
  }

  if (completeDatasets.length > 1) {
    throw new Error(
      "O ZIP contém mais de um shapefile completo. Envie apenas um conjunto por upload."
    );
  }

  return completeDatasets[0];
}

function toArrayBuffer(buffer: Buffer) {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

function toFeatureCollection(raw: unknown): FeatureCollectionRecord {
  if (Array.isArray(raw)) {
    if (raw.length !== 1) {
      throw new Error(
        "O arquivo ZIP gerou múltiplas camadas. Envie apenas um shapefile por upload."
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

  throw new Error("Não foi possível interpretar o shapefile como GeoJSON.");
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
      throw new Error("O shapefile contém geometria vazia ou inválida.");
    }

    if (feature.geometry.type === "Point") {
      if (!isFiniteLngLat(feature.geometry.coordinates)) {
        throw new Error("O shapefile contém ponto com coordenadas inválidas.");
      }
      exploded.push(feature);
      continue;
    }

    if (feature.geometry.type === "MultiPoint") {
      if (!Array.isArray(feature.geometry.coordinates)) {
        throw new Error("O shapefile contém multiponto com coordenadas inválidas.");
      }

      for (const coordinates of feature.geometry.coordinates) {
        if (!isFiniteLngLat(coordinates)) {
          throw new Error(
            "O shapefile contém multiponto com coordenadas inválidas."
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

    throw new Error(
      "A camada enviada possui geometria incompatível. Para este fluxo, use apenas feições pontuais."
    );
  }

  if (exploded.length === 0) {
    throw new Error("O shapefile não possui feições válidas para publicar.");
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

export async function importInfrastructureLayerFromZip(input: {
  code: InfrastructureLayerCodeId;
  buffer: Buffer;
}) {
  const archiveEntries = unzipSync(new Uint8Array(input.buffer));
  const entryNames = Object.keys(archiveEntries)
    .map(normalizeEntryName)
    .filter((entry) => entry.length > 0 && !entry.endsWith("/"));

  if (entryNames.length === 0) {
    throw new Error("O arquivo ZIP está vazio ou corrompido.");
  }

  const dataset = resolveDataset(entryNames);
  const prjEntry = dataset.files.prj;
  const cpgEntry = dataset.files.cpg;
  const prjContents = prjEntry ? strFromU8(archiveEntries[prjEntry]).trim() : "";

  let shpjs: (input: ArrayBuffer) => Promise<unknown>;
  try {
    shpjs = (await import("shpjs")).default;
  } catch {
    throw new Error("Não foi possível carregar o processador de shapefile.");
  }

  let parsed: unknown;
  try {
    parsed = await shpjs(toArrayBuffer(input.buffer));
  } catch (error) {
    console.error("[INFRASTRUCTURE_LAYER_PARSE_ERROR]", error);
    throw new Error(
      `Falha ao processar ${INFRASTRUCTURE_LAYER_LABELS[input.code]}. Verifique se o shapefile não está corrompido.`
    );
  }

  const featureCollection = explodeMultiPointFeatures(toFeatureCollection(parsed));

  if (detectOutOfBoundsCoordinates(featureCollection)) {
    throw new Error(
      "As coordenadas publicadas ficaram fora de EPSG:4326. Revise o arquivo .prj e reprojete o shapefile antes do upload."
    );
  }

  return {
    code: input.code,
    datasetName: dataset.baseName,
    originalCrs: prjContents || null,
    featureCount: featureCollection.features.length,
    geometryType: "POINT" as const,
    bbox: computeBbox(featureCollection),
    geoJsonData: featureCollection,
    metadata: {
      requiredFiles: REQUIRED_EXTENSIONS.map((extension) => `.${extension}`),
      optionalFiles: OPTIONAL_EXTENSIONS.map((extension) => `.${extension}`),
      zipEntries: entryNames,
      hasCpg: Boolean(cpgEntry),
    },
  } satisfies InfrastructureLayerImportResult;
}
