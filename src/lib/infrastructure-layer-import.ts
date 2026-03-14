import { unzipSync, strFromU8 } from "fflate";
import {
  INFRASTRUCTURE_LAYER_LABELS,
  INFRASTRUCTURE_LAYER_SPECS,
  isInfrastructureLayerCode,
  type InfrastructureLayerCodeId,
  type InfrastructureLayerNormalizedProperties,
} from "@/lib/infrastructure-layer-config";
import {
  PONNOT_FIELD_ALIASES,
  buildPonnotLabel,
  decodePonnotAlt,
  decodePonnotEsf,
  resolvePonnotQtdUcs,
} from "@/lib/ponnot";

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

type OwnerTenantContext = {
  id: string;
  name: string;
  state: string;
  slug: string;
};

type InfrastructureLayerImportContext = {
  ownerTenant: OwnerTenantContext | null;
  ponnotUcCountsByCodId?: Record<string, number> | Map<string, number> | null;
};

type InfrastructureFeatureCoverageKey =
  | "identifier"
  | "label"
  | "municipalityName"
  | "streetName"
  | "neighborhood"
  | "district"
  | "region"
  | "feeder"
  | "circuit"
  | "supportType"
  | "operationalStatus"
  | "lampType"
  | "powerWatts"
  | "reference";

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
  normalizedCrs: "EPSG:4326";
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
    normalizedCrs: "EPSG:4326";
    ownerTenantId: string | null;
    ownerTenantName: string | null;
    ownerTenantState: string | null;
    labelReadyCount: number;
    sourcePropertyKeys: string[];
    normalizedPropertyKeys: string[];
    attributeCoverage: Record<InfrastructureFeatureCoverageKey, number>;
  };
}

const REQUIRED_EXTENSIONS = ["shp", "shx", "dbf", "prj"] as const;
const OPTIONAL_EXTENSIONS = ["cpg"] as const;
const NORMALIZED_CRS = "EPSG:4326";
const COORDINATE_PRECISION = 6;

type RequiredExtension = (typeof REQUIRED_EXTENSIONS)[number];
type OptionalExtension = (typeof OPTIONAL_EXTENSIONS)[number];
type RecognizedExtension = RequiredExtension | OptionalExtension;

type DatasetFiles = Partial<Record<RecognizedExtension, string>>;

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

function normalizePropertyKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeFreeText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeScalarString(value: unknown) {
  if (typeof value === "string") {
    const normalized = normalizeWhitespace(value);
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeIdentifier(value: string | null) {
  if (!value) return null;
  const normalized = normalizeWhitespace(value).replace(/\s+/g, "-");
  return normalized.length > 0 ? normalized : null;
}

function normalizeMunicipalityCode(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits.length > 0 ? digits : null;
}

function normalizeStatusValue(value: string | null) {
  if (!value) return null;
  const normalized = normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (normalized.length === 0) return null;
  return normalized;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const digitsOnly = normalized.replace(/\./g, "").replace(",", ".");
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(COORDINATE_PRECISION));
}

function buildNormalizedPropertyMap(properties: FeatureProperties) {
  const entries = Object.entries(properties ?? {});
  return new Map(
    entries.map(([key, value]) => [normalizePropertyKey(key), value])
  );
}

function pickPropertyValue(
  properties: FeatureProperties,
  aliases: readonly string[]
) {
  const normalizedMap = buildNormalizedPropertyMap(properties);
  for (const alias of aliases) {
    const value = normalizedMap.get(normalizePropertyKey(alias));
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function pickPropertyString(
  properties: FeatureProperties,
  aliases: readonly string[]
) {
  return normalizeFreeText(pickPropertyValue(properties, aliases));
}

function pickPropertyScalarString(
  properties: FeatureProperties,
  aliases: readonly string[]
) {
  return normalizeScalarString(pickPropertyValue(properties, aliases));
}

function pickPropertyNumber(
  properties: FeatureProperties,
  aliases: readonly string[]
) {
  return normalizeNumber(pickPropertyValue(properties, aliases));
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
      "O arquivo ZIP está corrompido ou não pôde ser aberto."
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

function buildLabel(
  code: InfrastructureLayerCodeId,
  rawLabel: string | null,
  identifier: string | null,
  index: number
) {
  const spec = INFRASTRUCTURE_LAYER_SPECS[code];
  if (rawLabel) return rawLabel;
  if (identifier) return `${spec.defaultLabelPrefix} ${identifier}`;
  return `${spec.defaultLabelPrefix} ${String(index).padStart(4, "0")}`;
}

function buildIdentifier(
  code: InfrastructureLayerCodeId,
  rawIdentifier: string | null,
  index: number
) {
  const spec = INFRASTRUCTURE_LAYER_SPECS[code];
  if (rawIdentifier) return rawIdentifier;
  return `${spec.defaultIdentifierPrefix}-${String(index).padStart(4, "0")}`;
}

function buildSearchText(values: Array<string | number | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value === null || value === undefined ? [] : [String(value)]))
        .map((value) => normalizeWhitespace(value))
        .filter((value) => value.length > 0)
    )
  ).join(" | ");
}

function buildFeatureId(
  code: InfrastructureLayerCodeId,
  identifier: string | null,
  index: number,
  usedIds: Set<string>
) {
  const base = normalizeIdentifier(identifier) ?? `${code}-${String(index).padStart(4, "0")}`;
  let candidate = `${code}:${base}`;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${code}:${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

export function normalizePonnotProperties(input: {
  properties: FeatureProperties;
  index: number;
  ownerTenant: OwnerTenantContext | null;
  linkedUcCountsByCodId?: Record<string, number> | Map<string, number> | null;
}) {
  const rawCodId = pickPropertyScalarString(input.properties, [
    ...PONNOT_FIELD_ALIASES.COD_ID,
    ...INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.identifier,
  ]);
  const codId =
    rawCodId ??
    buildIdentifier("PONNOT", null, input.index);
  const estr = pickPropertyScalarString(input.properties, PONNOT_FIELD_ALIASES.ESTR);
  const alt = pickPropertyScalarString(input.properties, PONNOT_FIELD_ALIASES.ALT);
  const esf = pickPropertyScalarString(input.properties, PONNOT_FIELD_ALIASES.ESF);
  const qtdUcs = resolvePonnotQtdUcs({
    rawQtdUcs: pickPropertyValue(input.properties, PONNOT_FIELD_ALIASES.QTD_UCS),
    codId,
    linkedUcCountsByCodId: input.linkedUcCountsByCodId,
  });
  const altDecoded = decodePonnotAlt(alt);
  const esfDecoded = decodePonnotEsf(esf);
  const municipalityName =
    pickPropertyString(input.properties, INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.municipalityName) ??
    input.ownerTenant?.name ??
    null;
  const municipalityCode = normalizeMunicipalityCode(
    pickPropertyString(input.properties, INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.municipalityCode)
  );
  const streetName = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.streetName
  );
  const neighborhood = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.neighborhood
  );
  const district = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.district
  );
  const region = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.region
  );
  const feeder = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.feeder
  );
  const circuit = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.circuit
  );
  const supportType =
    estr ??
    pickPropertyString(input.properties, INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.supportType);
  const operationalStatus = normalizeStatusValue(
    pickPropertyString(
      input.properties,
      INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.operationalStatus
    )
  );
  const reference = pickPropertyString(
    input.properties,
    INFRASTRUCTURE_LAYER_SPECS.PONNOT.fields.reference
  );
  const labelMultiline = buildPonnotLabel({
    codId,
    estr,
    altDecoded,
    esfDecoded,
    qtdUcs,
  });

  return {
    layerCode: "PONNOT" as const,
    layerLabel: INFRASTRUCTURE_LAYER_SPECS.PONNOT.label,
    layerShortLabel: INFRASTRUCTURE_LAYER_SPECS.PONNOT.shortLabel,
    featureKind: INFRASTRUCTURE_LAYER_SPECS.PONNOT.featureKind,
    label: codId,
    labelShort: codId,
    labelMultiline,
    name: codId,
    NOME: codId,
    identifier: codId,
    code: codId,
    codigo: codId,
    CODIGO: codId,
    COD_ID: codId,
    ESTR: estr,
    ALT: alt,
    ESF: esf,
    QTD_UCS: qtdUcs,
    ALT_DECODIFICADO: altDecoded,
    ESF_DECODIFICADO: esfDecoded,
    ownerTenantId: input.ownerTenant?.id ?? null,
    municipalityName,
    municipalityCode,
    municipalityState: input.ownerTenant?.state ?? null,
    streetName,
    neighborhood,
    district,
    region,
    feeder,
    circuit,
    supportType,
    operationalStatus,
    lampType: null,
    powerWatts: null,
    reference,
    renderColor: INFRASTRUCTURE_LAYER_SPECS.PONNOT.renderColor,
    renderIcon: INFRASTRUCTURE_LAYER_SPECS.PONNOT.renderIcon,
    searchText: buildSearchText([
      codId,
      estr,
      alt,
      altDecoded,
      esf,
      esfDecoded,
      qtdUcs,
      municipalityName,
      municipalityCode,
      streetName,
      neighborhood,
      district,
      region,
      feeder,
      circuit,
      operationalStatus,
      reference,
    ]),
  } satisfies InfrastructureLayerNormalizedProperties;
}

export function normalizePontIlumProperties(input: {
  properties: FeatureProperties;
  index: number;
  ownerTenant: OwnerTenantContext | null;
}) {
  const spec = INFRASTRUCTURE_LAYER_SPECS.PONT_ILUM;
  const txtLum = pickPropertyScalarString(input.properties, ["TXT_LUM", "TXTLUM"]);
  const rawIdentifier = normalizeIdentifier(
    pickPropertyString(input.properties, spec.fields.identifier)
  );
  const identifier = buildIdentifier("PONT_ILUM", rawIdentifier, input.index);
  const label = txtLum ?? identifier ?? `Ponto de iluminação ${String(input.index).padStart(4, "0")}`;
  const municipalityName =
    pickPropertyString(input.properties, spec.fields.municipalityName) ??
    input.ownerTenant?.name ??
    null;
  const municipalityCode = normalizeMunicipalityCode(
    pickPropertyString(input.properties, spec.fields.municipalityCode)
  );
  const streetName = pickPropertyString(input.properties, spec.fields.streetName);
  const neighborhood = pickPropertyString(input.properties, spec.fields.neighborhood);
  const district = pickPropertyString(input.properties, spec.fields.district);
  const region = pickPropertyString(input.properties, spec.fields.region);
  const feeder = pickPropertyString(input.properties, spec.fields.feeder);
  const circuit = pickPropertyString(input.properties, spec.fields.circuit);
  const supportType = pickPropertyString(input.properties, spec.fields.supportType);
  const operationalStatus = normalizeStatusValue(
    pickPropertyString(input.properties, spec.fields.operationalStatus)
  );
  const lampType = pickPropertyString(input.properties, spec.fields.lampType);
  const powerWatts = pickPropertyNumber(input.properties, spec.fields.powerWatts);
  const reference = pickPropertyString(input.properties, spec.fields.reference);

  return {
    layerCode: "PONT_ILUM" as const,
    layerLabel: spec.label,
    layerShortLabel: spec.shortLabel,
    featureKind: spec.featureKind,
    label,
    labelShort: txtLum ?? label,
    TXT_LUM: txtLum,
    name: label,
    NOME: label,
    identifier,
    code: identifier,
    codigo: identifier,
    CODIGO: identifier,
    ownerTenantId: input.ownerTenant?.id ?? null,
    municipalityName,
    municipalityCode,
    municipalityState: input.ownerTenant?.state ?? null,
    streetName,
    neighborhood,
    district,
    region,
    feeder,
    circuit,
    supportType,
    operationalStatus,
    lampType,
    powerWatts,
    reference,
    renderColor: spec.renderColor,
    renderIcon: spec.renderIcon,
    searchText: buildSearchText([
      txtLum,
      identifier,
      municipalityName,
      municipalityCode,
      streetName,
      neighborhood,
      district,
      region,
      feeder,
      circuit,
      supportType,
      operationalStatus,
      lampType,
      powerWatts,
      reference,
    ]),
  } satisfies InfrastructureLayerNormalizedProperties;
}

function normalizeInfrastructureFeatureProperties(input: {
  code: InfrastructureLayerCodeId;
  properties: FeatureProperties;
  index: number;
  ownerTenant: OwnerTenantContext | null;
  ponnotUcCountsByCodId?: Record<string, number> | Map<string, number> | null;
}) {
  if (input.code === "PONNOT") {
    return normalizePonnotProperties({
      properties: input.properties,
      index: input.index,
      ownerTenant: input.ownerTenant,
      linkedUcCountsByCodId: input.ponnotUcCountsByCodId,
    });
  }

  if (input.code === "PONT_ILUM") {
    return normalizePontIlumProperties({
      properties: input.properties,
      index: input.index,
      ownerTenant: input.ownerTenant,
    });
  }

  const fallbackCode = input.code as InfrastructureLayerCodeId;
  const spec = INFRASTRUCTURE_LAYER_SPECS[fallbackCode];
  const rawLabel = pickPropertyString(input.properties, spec.fields.label);
  const rawIdentifier = normalizeIdentifier(
    pickPropertyString(input.properties, spec.fields.identifier)
  );
  const identifier = buildIdentifier(input.code, rawIdentifier, input.index);
  const label = buildLabel(input.code, rawLabel, identifier, input.index);
  const municipalityName =
    pickPropertyString(input.properties, spec.fields.municipalityName) ??
    input.ownerTenant?.name ??
    null;
  const municipalityCode = normalizeMunicipalityCode(
    pickPropertyString(input.properties, spec.fields.municipalityCode)
  );
  const streetName = pickPropertyString(input.properties, spec.fields.streetName);
  const neighborhood = pickPropertyString(input.properties, spec.fields.neighborhood);
  const district = pickPropertyString(input.properties, spec.fields.district);
  const region = pickPropertyString(input.properties, spec.fields.region);
  const feeder = pickPropertyString(input.properties, spec.fields.feeder);
  const circuit = pickPropertyString(input.properties, spec.fields.circuit);
  const supportType = pickPropertyString(input.properties, spec.fields.supportType);
  const operationalStatus = normalizeStatusValue(
    pickPropertyString(input.properties, spec.fields.operationalStatus)
  );
  const lampType = pickPropertyString(input.properties, spec.fields.lampType);
  const powerWatts = pickPropertyNumber(input.properties, spec.fields.powerWatts);
  const reference = pickPropertyString(input.properties, spec.fields.reference);
  const labelShort = identifier ?? label;

  const normalized = {
    layerCode: fallbackCode,
    layerLabel: spec.label,
    layerShortLabel: spec.shortLabel,
    featureKind: spec.featureKind,
    label,
    labelShort,
    name: label,
    NOME: label,
    identifier,
    code: identifier,
    codigo: identifier,
    CODIGO: identifier,
    ownerTenantId: input.ownerTenant?.id ?? null,
    municipalityName,
    municipalityCode,
    municipalityState: input.ownerTenant?.state ?? null,
    streetName,
    neighborhood,
    district,
    region,
    feeder,
    circuit,
    supportType,
    operationalStatus,
    lampType,
    powerWatts,
    reference,
    renderColor: spec.renderColor,
    renderIcon: spec.renderIcon,
    searchText: buildSearchText([
      spec.label,
      label,
      labelShort,
      municipalityName,
      municipalityCode,
      streetName,
      neighborhood,
      district,
      region,
      feeder,
      circuit,
      supportType,
      operationalStatus,
      lampType,
      powerWatts,
      reference,
    ]),
  } satisfies InfrastructureLayerNormalizedProperties;

  return normalized;
}

function normalizeFeatureCollection(input: {
  code: InfrastructureLayerCodeId;
  featureCollection: FeatureCollectionRecord;
  ownerTenant: OwnerTenantContext | null;
  ponnotUcCountsByCodId?: Record<string, number> | Map<string, number> | null;
}) {
  const usedIds = new Set<string>();
  const sourcePropertyKeys = new Set<string>();
  const normalizedPropertyKeys = new Set<string>();
  const attributeCoverage: Record<InfrastructureFeatureCoverageKey, number> = {
    identifier: 0,
    label: 0,
    municipalityName: 0,
    streetName: 0,
    neighborhood: 0,
    district: 0,
    region: 0,
    feeder: 0,
    circuit: 0,
    supportType: 0,
    operationalStatus: 0,
    lampType: 0,
    powerWatts: 0,
    reference: 0,
  };

  let labelReadyCount = 0;

  const features = input.featureCollection.features.map((feature, index) => {
    const coordinates = feature.geometry?.coordinates;
    if (!isFiniteLngLat(coordinates)) {
      throw createImportError(
        "INVALID_GEOMETRY",
        "O shapefile contém ponto com coordenadas inválidas."
      );
    }

    Object.keys(feature.properties ?? {}).forEach((key) => sourcePropertyKeys.add(key));

    const normalizedProperties = normalizeInfrastructureFeatureProperties({
      code: input.code,
      properties: feature.properties,
      index: index + 1,
      ownerTenant: input.ownerTenant,
      ponnotUcCountsByCodId: input.ponnotUcCountsByCodId,
    });

    Object.keys(normalizedProperties).forEach((key) => normalizedPropertyKeys.add(key));

    if (normalizedProperties.identifier) attributeCoverage.identifier += 1;
    if (normalizedProperties.label) attributeCoverage.label += 1;
    if (normalizedProperties.municipalityName) attributeCoverage.municipalityName += 1;
    if (normalizedProperties.streetName) attributeCoverage.streetName += 1;
    if (normalizedProperties.neighborhood) attributeCoverage.neighborhood += 1;
    if (normalizedProperties.district) attributeCoverage.district += 1;
    if (normalizedProperties.region) attributeCoverage.region += 1;
    if (normalizedProperties.feeder) attributeCoverage.feeder += 1;
    if (normalizedProperties.circuit) attributeCoverage.circuit += 1;
    if (normalizedProperties.supportType) attributeCoverage.supportType += 1;
    if (normalizedProperties.operationalStatus) attributeCoverage.operationalStatus += 1;
    if (normalizedProperties.lampType) attributeCoverage.lampType += 1;
    if (normalizedProperties.powerWatts !== null) attributeCoverage.powerWatts += 1;
    if (normalizedProperties.reference) attributeCoverage.reference += 1;
    if (normalizedProperties.label) labelReadyCount += 1;

    return {
      type: "Feature",
      id: buildFeatureId(
        input.code,
        normalizedProperties.identifier,
        index + 1,
        usedIds
      ),
      geometry: {
        type: "Point",
        coordinates: [
          roundCoordinate(coordinates[0]),
          roundCoordinate(coordinates[1]),
        ],
      },
      properties: normalizedProperties,
    } satisfies FeatureRecord;
  });

  return {
    featureCollection: {
      type: "FeatureCollection",
      features,
    } satisfies FeatureCollectionRecord,
    labelReadyCount,
    sourcePropertyKeys: Array.from(sourcePropertyKeys).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
    normalizedPropertyKeys: Array.from(normalizedPropertyKeys).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
    attributeCoverage,
  };
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
  context?: Partial<InfrastructureLayerImportContext>;
}) {
  const inspection =
    input.inspection ??
    inspectInfrastructureLayerArchive({
      buffer: input.buffer,
      expectedCode: input.expectedCode,
    });

  let shpjs: (archive: ArrayBuffer) => Promise<unknown>;
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

  const exploded = explodeMultiPointFeatures(toFeatureCollection(parsed));

  if (detectOutOfBoundsCoordinates(exploded)) {
    throw createImportError(
      "OUT_OF_BOUNDS_CRS",
      "As coordenadas publicadas ficaram fora de EPSG:4326. Revise o arquivo .prj e reprojete o shapefile antes do upload.",
      {
        datasetName: inspection.datasetName,
        originalCrs: inspection.originalCrs,
      }
    );
  }

  const normalized = normalizeFeatureCollection({
    code: inspection.code,
    featureCollection: exploded,
    ownerTenant: input.context?.ownerTenant ?? null,
    ponnotUcCountsByCodId: input.context?.ponnotUcCountsByCodId ?? null,
  });

  return {
    ...inspection,
    normalizedCrs: NORMALIZED_CRS,
    featureCount: normalized.featureCollection.features.length,
    geometryType: "POINT" as const,
    bbox: computeBbox(normalized.featureCollection),
    geoJsonData: normalized.featureCollection,
    metadata: {
      requiredFiles: inspection.requiredFiles,
      optionalFiles: inspection.optionalFiles,
      zipEntries: inspection.entryNames,
      hasCpg: inspection.hasCpg,
      detectedCode: inspection.detectedCode,
      archiveFiles: inspection.archiveFiles,
      normalizedCrs: NORMALIZED_CRS,
      ownerTenantId: input.context?.ownerTenant?.id ?? null,
      ownerTenantName: input.context?.ownerTenant?.name ?? null,
      ownerTenantState: input.context?.ownerTenant?.state ?? null,
      labelReadyCount: normalized.labelReadyCount,
      sourcePropertyKeys: normalized.sourcePropertyKeys,
      normalizedPropertyKeys: normalized.normalizedPropertyKeys,
      attributeCoverage: normalized.attributeCoverage,
    },
  } satisfies InfrastructureLayerImportResult;
}
