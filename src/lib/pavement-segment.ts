import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";
import {
  assessPavementRoadSegment,
  type PavementRoadSegmentAssessment,
} from "@/lib/pavement-technical";

export type PavementRoadSegmentProjectContext = {
  id: string;
  name: string;
  code: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
};

export type PavementRoadSegmentUserContext = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

type GeoPointLike = {
  lat: number;
  lng: number;
};

type PavementRoadSegmentFeatureLike = Pick<
  DrawnFeature,
  "label" | "type" | "coords" | "attributes"
> & {
  id?: string;
  createdAt?: number;
  createdAtIso?: string;
};

export type PavementRoadSegmentGeometryValidation = {
  normalizedCoords: GeoPointLike[];
  lengthMeters: number;
  errors: string[];
  warnings: string[];
};

export type PavementRoadSegmentAutoContext = {
  lengthMeters: number;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  projectId: string;
  projectLabel: string;
  creatorId: string | null;
  creatorName: string | null;
  creatorEmail: string | null;
  creatorRole: string | null;
  createdAtIso: string;
  geometryValidation: PavementRoadSegmentGeometryValidation;
};

const MIN_LENGTH_METERS = 8;
const SHORT_LENGTH_WARNING_METERS = 20;

export const PAVEMENT_ROAD_SEGMENT_DEFAULT_TECHNICAL_VALUES: Record<string, string> = {
  pavementType: "ASFALTO",
  interventionPriority: "MEDIA",
  roadHierarchy: "LOCAL",
  interventionType: "MANUTENCAO",
  widthSource: "ESTIMADA",
  widthMeters: "7",
  laneCount: "2",
  surfaceCondition: "REGULAR",
  operationalStatus: "LIBERADO",
  criticality: "MEDIA",
  estimatedUnitCostSqm: "",
};

export function isPavementRoadSegmentObjectType(technicalObjectType?: string | null) {
  return technicalObjectType === "TRECHO_PAVIMENTO";
}

export function mergePavementRoadSegmentDefaultValues(values: Record<string, string>) {
  return {
    ...PAVEMENT_ROAD_SEGMENT_DEFAULT_TECHNICAL_VALUES,
    ...Object.fromEntries(
      Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    ),
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function roundCoordKey(point: GeoPointLike) {
  return `${point.lat.toFixed(7)}:${point.lng.toFixed(7)}`;
}

function isValidPoint(point: GeoPointLike | null | undefined): point is GeoPointLike {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function pointsEqual(a: GeoPointLike, b: GeoPointLike) {
  return roundCoordKey(a) === roundCoordKey(b);
}

function normalizeLineCoords(coords: GeoPointLike[]) {
  const normalized: GeoPointLike[] = [];

  for (const point of coords) {
    if (!isValidPoint(point)) continue;
    if (normalized.length === 0 || !pointsEqual(normalized[normalized.length - 1], point)) {
      normalized.push(point);
    }
  }

  if (normalized.length > 2 && pointsEqual(normalized[0], normalized[normalized.length - 1])) {
    normalized.pop();
  }

  return normalized;
}

function getStreetNameFromProperties(properties: Record<string, unknown> | null | undefined) {
  if (!properties) return null;
  return (
    readString(properties.name) ??
    readString(properties.NAME) ??
    readString(properties.NOME) ??
    readString(properties.Rua) ??
    readString(properties.VIA) ??
    readString(properties.LOGRADOURO)
  );
}

function getFeatureCreatedAtIso(
  feature: PavementRoadSegmentFeatureLike,
  attributes: Record<string, unknown>
) {
  return (
    readString(attributes.createdAt) ??
    readString(feature.createdAtIso) ??
    new Date(feature.createdAt ?? Date.now()).toISOString()
  );
}

function buildAnchorPoint(feature: PavementRoadSegmentFeatureLike) {
  const coords = normalizeLineCoords(feature.coords);
  if (coords.length === 0) return null;
  if (coords.length === 1) return turf.point([coords[0].lng, coords[0].lat]);

  const line = turf.lineString(coords.map((coord) => [coord.lng, coord.lat]));
  const lengthKm = turf.length(line, { units: "kilometers" });
  if (lengthKm <= 0) return turf.point([coords[0].lng, coords[0].lat]);
  return turf.along(line, lengthKm / 2, { units: "kilometers" });
}

function getStreetCandidates(baseLayersData: BaseLayerData[]) {
  const candidates: Array<{ name: string; line: Feature<LineString> }> = [];

  for (const layer of baseLayersData) {
    if (layer.type !== "STREET_NAMES" && layer.type !== "STREETS") continue;

    const geoJsonData = layer.geoJsonData as FeatureCollection | undefined;
    if (!geoJsonData || !Array.isArray(geoJsonData.features)) continue;

    for (const feature of geoJsonData.features as Array<Feature<LineString | MultiLineString>>) {
      const name = getStreetNameFromProperties((feature.properties ?? {}) as Record<string, unknown>);
      if (!name || !feature.geometry) continue;

      if (feature.geometry.type === "LineString") {
        candidates.push({ name, line: turf.lineString(feature.geometry.coordinates) });
        continue;
      }

      if (feature.geometry.type === "MultiLineString") {
        for (const coordinates of feature.geometry.coordinates) {
          candidates.push({ name, line: turf.lineString(coordinates) });
        }
      }
    }
  }

  return candidates;
}

function inferStreetName(feature: PavementRoadSegmentFeatureLike, baseLayersData: BaseLayerData[]) {
  const anchor = buildAnchorPoint(feature);
  if (!anchor) return null;

  const candidates = getStreetCandidates(baseLayersData);
  let bestMatch: { name: string; distanceKm: number } | null = null;

  for (const candidate of candidates) {
    const snapped = turf.nearestPointOnLine(candidate.line, anchor, { units: "kilometers" });
    const distanceKm =
      typeof snapped.properties?.dist === "number" ? snapped.properties.dist : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(distanceKm)) continue;
    if (!bestMatch || distanceKm < bestMatch.distanceKm) {
      bestMatch = { name: candidate.name, distanceKm };
    }
  }

  if (!bestMatch || bestMatch.distanceKm > 0.15) {
    return null;
  }

  return bestMatch.name;
}

export function validatePavementRoadSegmentGeometry(
  feature: Pick<PavementRoadSegmentFeatureLike, "coords">
): PavementRoadSegmentGeometryValidation {
  const normalizedCoords = normalizeLineCoords(feature.coords);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (normalizedCoords.length < 2) {
    errors.push("O trecho viário precisa de pelo menos dois vértices válidos.");
  }

  const lengthMeters =
    normalizedCoords.length >= 2
      ? turf.length(
          turf.lineString(normalizedCoords.map((coord) => [coord.lng, coord.lat])),
          { units: "kilometers" }
        ) * 1000
      : 0;

  if (lengthMeters > 0 && lengthMeters < MIN_LENGTH_METERS) {
    errors.push("O trecho viário precisa ter pelo menos 8 metros para cadastro.");
  } else if (lengthMeters > 0 && lengthMeters < SHORT_LENGTH_WARNING_METERS) {
    warnings.push("Trecho curto: revise se o lançamento representa o segmento viário desejado.");
  }

  return {
    normalizedCoords,
    lengthMeters,
    errors,
    warnings,
  };
}

export function buildPavementRoadSegmentAutoContext({
  feature,
  baseLayersData,
  project,
  currentUser,
}: {
  feature: PavementRoadSegmentFeatureLike;
  baseLayersData: BaseLayerData[];
  project: PavementRoadSegmentProjectContext;
  currentUser: PavementRoadSegmentUserContext;
}): PavementRoadSegmentAutoContext {
  const attributes =
    feature.attributes && typeof feature.attributes === "object" && !Array.isArray(feature.attributes)
      ? feature.attributes
      : {};
  const geometryValidation = validatePavementRoadSegmentGeometry(feature);
  const streetName = inferStreetName(feature, baseLayersData);
  const projectLabel = project.code ? `${project.code} · ${project.name}` : project.name;

  return {
    lengthMeters: geometryValidation.lengthMeters,
    streetName,
    neighborhood: project.neighborhood,
    district: project.district,
    region: project.region,
    projectId: project.id,
    projectLabel,
    creatorId: currentUser.id,
    creatorName: currentUser.name,
    creatorEmail: currentUser.email,
    creatorRole: currentUser.role,
    createdAtIso: getFeatureCreatedAtIso(feature, attributes),
    geometryValidation,
  };
}

export function buildPavementRoadSegmentSuggestedName(
  autoContext: PavementRoadSegmentAutoContext,
  values?: Record<string, string>
) {
  const hierarchyLabel =
    values?.roadHierarchy === "ARTERIAL"
      ? "Arterial"
      : values?.roadHierarchy === "COLETORA"
        ? "Coletora"
        : values?.roadHierarchy === "CORREDOR"
          ? "Corredor"
          : values?.roadHierarchy === "RURAL"
            ? "Trecho rural"
            : "Trecho viário";

  if (autoContext.streetName) {
    return `${hierarchyLabel} · ${autoContext.streetName}`;
  }

  if (autoContext.neighborhood) {
    return `${hierarchyLabel} · ${autoContext.neighborhood}`;
  }

  return `${hierarchyLabel} · ${autoContext.projectLabel}`;
}

export function evaluatePavementRoadSegment(
  values: Record<string, string>,
  autoContext: PavementRoadSegmentAutoContext
) {
  return assessPavementRoadSegment(values, {
    lengthMeters: autoContext.lengthMeters,
  });
}

export function buildPavementRoadSegmentAssistAttributes(
  autoContext: PavementRoadSegmentAutoContext,
  assessment: PavementRoadSegmentAssessment,
  values: Record<string, string>
) {
  return {
    lengthMeters: Number(autoContext.lengthMeters.toFixed(2)),
    streetName: autoContext.streetName ?? undefined,
    neighborhood: autoContext.neighborhood ?? undefined,
    district: autoContext.district ?? undefined,
    region: autoContext.region ?? undefined,
    projectId: autoContext.projectId,
    projectLabel: autoContext.projectLabel,
    createdById: autoContext.creatorId ?? undefined,
    createdByName: autoContext.creatorName ?? undefined,
    createdByEmail: autoContext.creatorEmail ?? undefined,
    createdByRole: autoContext.creatorRole ?? undefined,
    createdAt: autoContext.createdAtIso,
    widthSource: values.widthSource || undefined,
    effectiveWidthMeters: assessment.effectiveWidthMeters ?? undefined,
    widthWasEstimated: assessment.widthWasEstimated,
    areaSqm: assessment.areaSqm ?? undefined,
    estimatedUnitCostSqm: assessment.estimatedUnitCostSqm ?? undefined,
    estimatedTotalCost: assessment.estimatedTotalCost ?? undefined,
    suggestedSurfaceCondition: assessment.suggestedSurfaceCondition,
    suggestedPriority: assessment.suggestedPriority,
    roadHierarchy: values.roadHierarchy || undefined,
    interventionType: values.interventionType || undefined,
  };
}
