import {
  isInfrastructureLayerCode,
  type InfrastructureLayerCodeId,
} from "@/lib/infrastructure-layer-config";

export type InfrastructureLayerFeatureFilters = {
  code: InfrastructureLayerCodeId | "ALL";
  search: string;
  operationalStatus: string;
};

export type SimpleGeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<Record<string, unknown>>;
};

export const EMPTY_INFRASTRUCTURE_LAYER_FILTERS: InfrastructureLayerFeatureFilters = {
  code: "ALL",
  search: "",
  operationalStatus: "ALL",
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

  if (!normalizedQuery && !normalizedStatus) {
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

      return matchesSearch && matchesStatus;
    }),
  };
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
