import * as turf from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  MultiPolygon,
  Polygon,
} from "geojson";

export type TenantBaseLayerType = "BOUNDARY" | "STREETS" | "STREET_NAMES";

type MunicipalityBoundaryResult = {
  municipalityCode: string;
  municipalityName: string;
  featureCollection: FeatureCollection;
  source: "IBGE" | "EXISTING";
};

type ImportTenantBaseLayerInput = {
  buffer: ArrayBuffer;
  type: TenantBaseLayerType;
  tenantName: string;
  tenantState: string;
  existingBoundaryGeoJson?: unknown;
};

type ImportTenantBaseLayerResult = {
  geoJsonData: FeatureCollection;
  boundaryGeoJson: FeatureCollection | null;
  municipalityCode: string | null;
  municipalityName: string | null;
  boundarySource: "IBGE" | "EXISTING" | null;
};

const STREET_NAME_KEYS = [
  "name",
  "NAME",
  "Name",
  "NOME",
  "NM_LOGR",
  "NMLOGR",
  "LOGRADOURO",
  "RUA",
  "Rua",
  "VIA",
  "TXT",
  "TEXT",
  "TEXTSTRING",
  "LABEL",
  "ROTULO",
  "RÓTULO",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(prefeitura|municipio|município|cidade|de|da|do|dos|das)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBestMunicipalityMatch(
  municipalities: Array<{ id: number; nome: string }>,
  tenantName: string
) {
  const target = normalizeText(tenantName);
  let best: { id: number; nome: string; score: number } | null = null;

  for (const municipality of municipalities) {
    const normalized = normalizeText(municipality.nome);
    let score = 0;

    if (normalized === target) score = 100;
    else if (normalized.startsWith(target) || target.startsWith(normalized)) score = 80;
    else if (normalized.includes(target) || target.includes(normalized)) score = 60;

    if (!best || score > best.score) {
      best = { ...municipality, score };
    }
  }

  return best && best.score > 0 ? best : null;
}

function normalizeFeatureCollection(raw: unknown): FeatureCollection {
  let parsed = raw;

  if (Array.isArray(parsed)) {
    parsed = parsed[0];
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    (parsed as { type?: string }).type === "FeatureCollection"
  ) {
    const features = Array.isArray((parsed as { features?: unknown }).features)
      ? ((parsed as { features: unknown[] }).features as Feature[])
      : [];

    return {
      type: "FeatureCollection",
      features,
    };
  }

  throw new Error("O shapefile enviado não gerou um GeoJSON válido.");
}

function pickFirstString(properties: GeoJsonProperties | null | undefined, keys: string[]) {
  if (!properties) return null;
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeStreetNameFeature(feature: Feature<Geometry>): Feature<Geometry> {
  const properties = { ...(feature.properties ?? {}) } as Record<string, unknown>;
  const streetName = pickFirstString(properties, STREET_NAME_KEYS);

  if (streetName) {
    properties.name = streetName;
    properties.label = streetName;
  }

  return {
    ...feature,
    properties: properties as GeoJsonProperties,
  };
}

function normalizeStreetNameCollection(collection: FeatureCollection) {
  return {
    type: "FeatureCollection" as const,
    features: collection.features.map((feature) => normalizeStreetNameFeature(feature)),
  };
}

function getBoundaryFeature(
  collection: FeatureCollection
): Feature<Polygon | MultiPolygon> | null {
  for (const feature of collection.features) {
    if (!feature?.geometry) continue;
    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
      return feature as Feature<Polygon | MultiPolygon>;
    }
  }
  return null;
}

function isEmptyGeometry(geometry: Geometry | null | undefined) {
  if (!geometry) return true;

  const coordinates = (geometry as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return true;
  return coordinates.length === 0;
}

function clipFeatureToBoundary(
  feature: Feature<Geometry>,
  boundaryFeature: Feature<Polygon | MultiPolygon>,
  boundaryBbox: [number, number, number, number]
) {
  if (!feature.geometry) return null;

  try {
    if (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint") {
      return turf.booleanIntersects(feature as never, boundaryFeature as never)
        ? feature
        : null;
    }

    const clipped = turf.bboxClip(feature as never, boundaryBbox) as Feature<Geometry>;
    if (!clipped.geometry || isEmptyGeometry(clipped.geometry)) return null;
    if (!turf.booleanIntersects(clipped as never, boundaryFeature as never)) return null;
    return clipped;
  } catch {
    return turf.booleanIntersects(feature as never, boundaryFeature as never)
      ? feature
      : null;
  }
}

function limitCollectionToBoundary(
  collection: FeatureCollection,
  boundaryCollection: FeatureCollection
) {
  const boundaryFeature = getBoundaryFeature(boundaryCollection);
  if (!boundaryFeature) {
    throw new Error("O limite municipal retornado não possui geometria poligonal válida.");
  }

  const boundaryBbox = turf.bbox(boundaryFeature) as [number, number, number, number];
  const features = collection.features
    .map((feature) => clipFeatureToBoundary(feature as Feature<Geometry>, boundaryFeature, boundaryBbox))
    .filter((feature): feature is Feature<Geometry> => feature !== null);

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

async function fetchMunicipalityBoundaryFromIbge(
  tenantName: string,
  tenantState: string
): Promise<MunicipalityBoundaryResult> {
  const state = tenantState.trim().toUpperCase();
  const municipalitiesResponse = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!municipalitiesResponse.ok) {
    throw new Error("Não foi possível consultar os municípios do IBGE para obter o limite municipal.");
  }

  const municipalities = (await municipalitiesResponse.json()) as Array<{
    id: number;
    nome: string;
  }>;

  const match = getBestMunicipalityMatch(municipalities, tenantName);
  if (!match) {
    throw new Error(
      `O município ${tenantName}/${state} não foi localizado na base do IBGE para limitar a camada.`
    );
  }

  const boundaryResponse = await fetch(
    `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${match.id}?formato=application/vnd.geo+json&qualidade=minima`,
    {
      headers: {
        Accept: "application/vnd.geo+json, application/json",
      },
      cache: "no-store",
    }
  );

  if (!boundaryResponse.ok) {
    throw new Error("O IBGE não retornou o limite municipal em formato GeoJSON.");
  }

  const boundaryGeoJson = normalizeFeatureCollection(await boundaryResponse.json());

  return {
    municipalityCode: String(match.id),
    municipalityName: match.nome,
    featureCollection: boundaryGeoJson,
    source: "IBGE",
  };
}

function getExistingBoundaryFallback(
  rawBoundary: unknown
): MunicipalityBoundaryResult | null {
  if (!rawBoundary) return null;

  try {
    return {
      municipalityCode: "",
      municipalityName: "",
      featureCollection: normalizeFeatureCollection(rawBoundary),
      source: "EXISTING",
    };
  } catch {
    return null;
  }
}

export async function importTenantBaseLayerFromZip({
  buffer,
  type,
  tenantName,
  tenantState,
  existingBoundaryGeoJson,
}: ImportTenantBaseLayerInput): Promise<ImportTenantBaseLayerResult> {
  const shp = (await import("shpjs")).default;
  const rawGeoJson = await shp(buffer);
  let geoJsonData = normalizeFeatureCollection(rawGeoJson);
  let boundaryResult: MunicipalityBoundaryResult | null = null;

  if (type === "STREETS" || type === "STREET_NAMES") {
    try {
      boundaryResult = await fetchMunicipalityBoundaryFromIbge(tenantName, tenantState);
    } catch (error) {
      const fallback = getExistingBoundaryFallback(existingBoundaryGeoJson);
      if (!fallback) {
        throw error;
      }
      boundaryResult = fallback;
    }

    geoJsonData = limitCollectionToBoundary(geoJsonData, boundaryResult.featureCollection);
  }

  if (type === "STREET_NAMES") {
    geoJsonData = normalizeStreetNameCollection(geoJsonData);
  }

  return {
    geoJsonData,
    boundaryGeoJson: boundaryResult?.featureCollection ?? null,
    municipalityCode: boundaryResult?.municipalityCode || null,
    municipalityName: boundaryResult?.municipalityName || null,
    boundarySource: boundaryResult?.source ?? null,
  };
}
