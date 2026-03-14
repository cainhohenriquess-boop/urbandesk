import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import type { TechnicalObjectTypeId } from "@/lib/project-disciplines";
import { comprimentoTrechoM } from "@/lib/turf";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";

export type DrainageSegmentProjectContext = {
  id: string;
  name: string;
  code: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
};

export type DrainageSegmentUserContext = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

export type DrainageSegmentAutoContext = {
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
};

type DrainageSegmentFeatureLike = Pick<DrawnFeature, "type" | "coords" | "attributes"> & {
  createdAt?: number;
  createdAtIso?: string;
};

export const DRAINAGE_SEGMENT_DEFAULT_TECHNICAL_VALUES: Record<string, string> = {
  drainageSegmentType: "COLETOR",
  networkMaterial: "CONCRETO",
  flowDirection: "NAO_IDENTIFICADO",
  hydraulicCondition: "OPERANTE",
  diameterMm: "600",
  sectionType: "TUBULAR",
  depthClass: "DE_1_A_2M",
  assetCondition: "REGULAR",
  operationalStatus: "OPERANTE",
  priority: "MEDIA",
  criticality: "MEDIA",
};

export function isDrainageSegmentObjectType(
  technicalObjectType?: TechnicalObjectTypeId | null
): technicalObjectType is "TRECHO_DRENAGEM" {
  return technicalObjectType === "TRECHO_DRENAGEM";
}

export function mergeDrainageSegmentDefaultValues(values: Record<string, string>) {
  return {
    ...DRAINAGE_SEGMENT_DEFAULT_TECHNICAL_VALUES,
    ...Object.fromEntries(
      Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    ),
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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
  feature: DrainageSegmentFeatureLike,
  attributes: Record<string, unknown>
) {
  return (
    readString(attributes.createdAt) ??
    readString(feature.createdAtIso) ??
    new Date(feature.createdAt ?? Date.now()).toISOString()
  );
}

function buildAnchorPoint(feature: DrainageSegmentFeatureLike) {
  const coords = feature.coords.map((coord) => [coord.lng, coord.lat] as [number, number]);
  if (coords.length === 0) return null;
  if (coords.length === 1) return turf.point(coords[0]);

  const line = turf.lineString(coords);
  const lengthKm = turf.length(line, { units: "kilometers" });
  if (lengthKm <= 0) return turf.point(coords[0]);
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

function inferStreetName(feature: DrainageSegmentFeatureLike, baseLayersData: BaseLayerData[]) {
  const anchor = buildAnchorPoint(feature);
  if (!anchor) return null;

  const candidates = getStreetCandidates(baseLayersData);
  let bestMatch: { name: string; distanceKm: number } | null = null;

  for (const candidate of candidates) {
    const snapped = turf.nearestPointOnLine(candidate.line, anchor, { units: "kilometers" });
    const distanceKm = readNumber(snapped.properties?.dist) ?? Number.POSITIVE_INFINITY;

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

export function buildDrainageSegmentAutoContext(args: {
  feature: DrainageSegmentFeatureLike;
  baseLayersData: BaseLayerData[];
  project: DrainageSegmentProjectContext;
  currentUser: DrainageSegmentUserContext;
}) {
  const { feature, baseLayersData, project, currentUser } = args;
  const attributes = (feature.attributes ?? {}) as Record<string, unknown>;
  const lengthMeters =
    readNumber(attributes.lengthMeters) ??
    comprimentoTrechoM(feature.coords.map((coord) => [coord.lat, coord.lng] as [number, number]));

  return {
    lengthMeters,
    streetName: readString(attributes.streetName) ?? inferStreetName(feature, baseLayersData),
    neighborhood: readString(attributes.neighborhood) ?? project.neighborhood,
    district: readString(attributes.district) ?? project.district,
    region: readString(attributes.region) ?? project.region,
    projectId: project.id,
    projectLabel: project.code ? `${project.code} · ${project.name}` : project.name,
    creatorId: readString(attributes.createdById) ?? currentUser.id,
    creatorName:
      readString(attributes.createdByName) ??
      currentUser.name ??
      currentUser.email ??
      null,
    creatorEmail: readString(attributes.createdByEmail) ?? currentUser.email,
    creatorRole: readString(attributes.createdByRole) ?? currentUser.role,
    createdAtIso: getFeatureCreatedAtIso(feature, attributes),
  } satisfies DrainageSegmentAutoContext;
}

export function buildDrainageSegmentSuggestedName(context: DrainageSegmentAutoContext) {
  if (context.streetName) {
    return `Trecho de drenagem · ${context.streetName}`;
  }

  if (context.neighborhood) {
    return `Trecho de drenagem · ${context.neighborhood}`;
  }

  return "Trecho de drenagem";
}

export function buildDrainageSegmentAssistAttributes(context: DrainageSegmentAutoContext) {
  return {
    streetName: context.streetName ?? undefined,
    neighborhood: context.neighborhood ?? undefined,
    district: context.district ?? undefined,
    region: context.region ?? undefined,
    lengthMeters: Number.isFinite(context.lengthMeters) ? Number(context.lengthMeters.toFixed(2)) : undefined,
    createdById: context.creatorId ?? undefined,
    createdByName: context.creatorName ?? undefined,
    createdByEmail: context.creatorEmail ?? undefined,
    createdByRole: context.creatorRole ?? undefined,
    createdAt: context.createdAtIso,
    projectLabel: context.projectLabel,
    sourceFlow: "DRAINAGE_SEGMENT_ASSISTED",
  };
}
