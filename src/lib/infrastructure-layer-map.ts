import {
  isInfrastructureLayerCode,
  type InfrastructureLayerCodeId,
} from "@/lib/infrastructure-layer-config";

export type InfrastructureLayerFeatureFilters = {
  code: InfrastructureLayerCodeId | "ALL";
  search: string;
  operationalStatus: string;
  condition: string;
  municipalityName: string;
};

export type SimpleGeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<Record<string, unknown>>;
};

export type InfrastructureLayerFeatureRecord = {
  layerId: string;
  layerName: string;
  layerType: InfrastructureLayerCodeId;
  featureId: string;
  selectionKey: string;
  label: string;
  visibleLabel: string;
  municipalityName: string | null;
  municipalityState: string | null;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  operationalStatus: string | null;
  condition: string | null;
  circuit: string | null;
  txtLum: string | null;
  codId: string | null;
  qtdUcs: number | null;
  supportType: string | null;
  lampType: string | null;
  powerWatts: number | null;
  reference: string | null;
  coordinates: { lng: number; lat: number } | null;
  properties: Record<string, unknown>;
};

export const EMPTY_INFRASTRUCTURE_LAYER_FILTERS: InfrastructureLayerFeatureFilters = {
  code: "ALL",
  search: "",
  operationalStatus: "ALL",
  condition: "ALL",
  municipalityName: "ALL",
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readFeatureProperties(feature: Record<string, unknown>) {
  const properties = feature.properties;
  return properties && typeof properties === "object"
    ? (properties as Record<string, unknown>)
    : {};
}

function readStringValue(properties: Record<string, unknown>, key: string) {
  const value = properties[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNullableStringValue(properties: Record<string, unknown>, key: string) {
  const value = readStringValue(properties, key);
  return value.length > 0 ? value : null;
}

function readNumberValue(properties: Record<string, unknown>, key: string) {
  const value = properties[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function buildFeatureSearchText(properties: Record<string, unknown>) {
  const candidates = [
    readStringValue(properties, "searchText"),
    readStringValue(properties, "labelMultiline"),
    readStringValue(properties, "TXT_LUM"),
    readStringValue(properties, "label"),
    readStringValue(properties, "labelShort"),
    readStringValue(properties, "identifier"),
    readStringValue(properties, "COD_ID"),
    readStringValue(properties, "streetName"),
    readStringValue(properties, "circuit"),
    readStringValue(properties, "municipalityName"),
  ].filter(Boolean);

  return normalizeSearchValue(candidates.join(" "));
}

export function getInfrastructureFeatureVisibleLabel(
  properties: Record<string, unknown>,
  layerType: InfrastructureLayerCodeId
) {
  if (layerType === "PONNOT") {
    return (
      readNullableStringValue(properties, "labelMultiline") ??
      readNullableStringValue(properties, "COD_ID") ??
      readNullableStringValue(properties, "identifier") ??
      "PONNOT"
    );
  }

  return (
    readNullableStringValue(properties, "TXT_LUM") ??
    readNullableStringValue(properties, "label") ??
    readNullableStringValue(properties, "identifier") ??
    "PONT_ILUM"
  );
}

export function getInfrastructureFeatureCondition(properties: Record<string, unknown>) {
  return (
    readNullableStringValue(properties, "condition") ??
    readNullableStringValue(properties, "assetCondition") ??
    readNullableStringValue(properties, "supportCondition") ??
    readNullableStringValue(properties, "supportType") ??
    readNullableStringValue(properties, "lampType") ??
    null
  );
}

export function parseInfrastructureLayerCollection(
  raw: unknown
): SimpleGeoJsonFeatureCollection {
  try {
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) parsed = parsed[0];

    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: string }).type === "FeatureCollection"
    ) {
      const features = Array.isArray((parsed as { features?: unknown }).features)
        ? ((parsed as { features: unknown[] }).features as Array<Record<string, unknown>>)
        : [];

      return {
        type: "FeatureCollection",
        features,
      };
    }
  } catch (error) {
    console.error("GeoJSON de infraestrutura inválido", error);
  }

  return { type: "FeatureCollection", features: [] };
}

export function filterInfrastructureLayerCollection(
  raw: unknown,
  layerType: string,
  filters: InfrastructureLayerFeatureFilters
): SimpleGeoJsonFeatureCollection {
  const collection = parseInfrastructureLayerCollection(raw);

  if (!isInfrastructureLayerCode(layerType)) {
    return collection;
  }

  if (filters.code !== "ALL" && filters.code !== layerType) {
    return { type: "FeatureCollection", features: [] };
  }

  const normalizedQuery = normalizeSearchValue(filters.search);
  const normalizedStatus =
    filters.operationalStatus !== "ALL"
      ? normalizeSearchValue(filters.operationalStatus)
      : "";
  const normalizedCondition =
    filters.condition !== "ALL" ? normalizeSearchValue(filters.condition) : "";
  const normalizedMunicipality =
    filters.municipalityName !== "ALL"
      ? normalizeSearchValue(filters.municipalityName)
      : "";

  if (!normalizedQuery && !normalizedStatus && !normalizedCondition && !normalizedMunicipality) {
    return collection;
  }

  return {
    type: "FeatureCollection",
    features: collection.features.filter((feature) => {
      const properties = readFeatureProperties(feature);
      const matchesSearch =
        !normalizedQuery ||
        buildFeatureSearchText(properties).includes(normalizedQuery);
      const matchesStatus =
        !normalizedStatus ||
        normalizeSearchValue(readStringValue(properties, "operationalStatus")) ===
          normalizedStatus;
      const matchesCondition =
        !normalizedCondition ||
        normalizeSearchValue(getInfrastructureFeatureCondition(properties) ?? "") ===
          normalizedCondition;
      const matchesMunicipality =
        !normalizedMunicipality ||
        normalizeSearchValue(readStringValue(properties, "municipalityName")) ===
          normalizedMunicipality;

      return matchesSearch && matchesStatus && matchesCondition && matchesMunicipality;
    }),
  };
}

export function listInfrastructureLayerFeatures(
  layers: Array<{
    id?: string;
    name?: string;
    type: string;
    geoJsonData: unknown;
  }>
) {
  const items: InfrastructureLayerFeatureRecord[] = [];

  for (const layer of layers) {
    if (!isInfrastructureLayerCode(layer.type)) continue;
    const collection = parseInfrastructureLayerCollection(layer.geoJsonData);

    collection.features.forEach((feature, index) => {
      const properties = readFeatureProperties(feature);
      const featureId =
        readNullableStringValue(properties, "id") ??
        readNullableStringValue(properties, "identifier") ??
        readNullableStringValue(properties, "COD_ID") ??
        readNullableStringValue(properties, "TXT_LUM") ??
        `${layer.type}-${index + 1}`;
      const coordinates =
        feature.geometry &&
        typeof feature.geometry === "object" &&
        (feature.geometry as { type?: string }).type === "Point" &&
        Array.isArray((feature.geometry as { coordinates?: unknown }).coordinates)
          ? {
              lng: Number(
                ((feature.geometry as { coordinates: unknown[] }).coordinates[0] as number) ?? 0
              ),
              lat: Number(
                ((feature.geometry as { coordinates: unknown[] }).coordinates[1] as number) ?? 0
              ),
            }
          : null;

      items.push({
        layerId: layer.id ?? `${layer.type}-layer`,
        layerName: layer.name ?? layer.type,
        layerType: layer.type as InfrastructureLayerCodeId,
        featureId,
        selectionKey: `${layer.type}:${featureId}`,
        label:
          readNullableStringValue(properties, "label") ??
          readNullableStringValue(properties, "identifier") ??
          featureId,
        visibleLabel: getInfrastructureFeatureVisibleLabel(
          properties,
          layer.type as InfrastructureLayerCodeId
        ),
        municipalityName: readNullableStringValue(properties, "municipalityName"),
        municipalityState: readNullableStringValue(properties, "municipalityState"),
        streetName: readNullableStringValue(properties, "streetName"),
        neighborhood: readNullableStringValue(properties, "neighborhood"),
        district: readNullableStringValue(properties, "district"),
        region: readNullableStringValue(properties, "region"),
        operationalStatus: readNullableStringValue(properties, "operationalStatus"),
        condition: getInfrastructureFeatureCondition(properties),
        circuit: readNullableStringValue(properties, "circuit"),
        txtLum: readNullableStringValue(properties, "TXT_LUM"),
        codId: readNullableStringValue(properties, "COD_ID"),
        qtdUcs: readNumberValue(properties, "QTD_UCS"),
        supportType: readNullableStringValue(properties, "supportType"),
        lampType: readNullableStringValue(properties, "lampType"),
        powerWatts: readNumberValue(properties, "powerWatts"),
        reference: readNullableStringValue(properties, "reference"),
        coordinates:
          coordinates &&
          Number.isFinite(coordinates.lng) &&
          Number.isFinite(coordinates.lat)
            ? coordinates
            : null,
        properties,
      });
    });
  }

  return items;
}

export function collectInfrastructureLayerStatusOptions(
  layers: Array<{ type: string; geoJsonData: unknown }>
) {
  const values = new Set<string>();

  for (const layer of layers) {
    if (!isInfrastructureLayerCode(layer.type)) continue;
    const collection = parseInfrastructureLayerCollection(layer.geoJsonData);

    for (const feature of collection.features) {
      const properties = readFeatureProperties(feature);
      const status = readStringValue(properties, "operationalStatus");
      if (status) values.add(status);
    }
  }

  return Array.from(values).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export function countInfrastructureLayerFeatures(
  raw: unknown,
  layerType: string,
  filters: InfrastructureLayerFeatureFilters
) {
  return filterInfrastructureLayerCollection(raw, layerType, filters).features.length;
}

export function collectInfrastructureLayerConditionOptions(
  layers: Array<{ type: string; geoJsonData: unknown }>
) {
  const values = new Set<string>();

  for (const layer of layers) {
    if (!isInfrastructureLayerCode(layer.type)) continue;
    const collection = parseInfrastructureLayerCollection(layer.geoJsonData);

    for (const feature of collection.features) {
      const properties = readFeatureProperties(feature);
      const condition = getInfrastructureFeatureCondition(properties);
      if (condition) values.add(condition);
    }
  }

  return Array.from(values).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export function collectInfrastructureMunicipalityOptions(
  layers: Array<{ type: string; geoJsonData: unknown }>
) {
  const values = new Set<string>();

  for (const item of listInfrastructureLayerFeatures(layers)) {
    if (item.municipalityName) values.add(item.municipalityName);
  }

  return Array.from(values).sort((left, right) => left.localeCompare(right, "pt-BR"));
}
