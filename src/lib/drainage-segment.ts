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

type GeoPointLike = {
  lat: number;
  lng: number;
};

type DrainageSegmentFeatureLike = Pick<DrawnFeature, "label" | "type" | "coords" | "attributes"> & {
  id?: string;
  createdAt?: number;
  createdAtIso?: string;
};

export type DrainageSegmentConnection = {
  featureId: string;
  label: string;
  technicalObjectType: TechnicalObjectTypeId;
  position: "start" | "end";
  distanceMeters: number;
};

export type DrainageSegmentGeometryValidation = {
  normalizedCoords: GeoPointLike[];
  lengthMeters: number;
  errors: string[];
  warnings: string[];
};

export type DrainageSegmentAssessment = {
  suggestedCriticality: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  riskLevel: "BAIXO" | "MODERADO" | "ALTO" | "CRITICO";
  reason: string;
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
  geometryValidation: DrainageSegmentGeometryValidation;
  startConnection: DrainageSegmentConnection | null;
  endConnection: DrainageSegmentConnection | null;
  connectedStructureIds: string[];
};

const MIN_LENGTH_METERS = 5;
const SHORT_LENGTH_WARNING_METERS = 15;
const MAX_CONNECTION_DISTANCE_METERS = 14;

const DRAINAGE_STRUCTURE_TYPES = new Set<TechnicalObjectTypeId>([
  "BOCA_LOBO",
  "POCO_VISITA",
  "CAIXA_LIGACAO",
  "DISSIPADOR",
]);

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

export function readDrainageSegmentFieldValue(
  attributes: Record<string, unknown> | null | undefined,
  key: string
) {
  const technicalData =
    attributes?.technicalData && typeof attributes.technicalData === "object" && !Array.isArray(attributes.technicalData)
      ? (attributes.technicalData as Record<string, unknown>)
      : null;

  return readString(technicalData?.[key]) ?? readString(attributes?.[key]);
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

function buildDrainageConnectionLabel(feature: DrainageSegmentFeatureLike, technicalObjectType: TechnicalObjectTypeId) {
  const labels: Partial<Record<TechnicalObjectTypeId, string>> = {
    BOCA_LOBO: "Boca de lobo",
    POCO_VISITA: "Poço de visita",
    CAIXA_LIGACAO: "Caixa de ligação",
    DISSIPADOR: "Dissipador",
  };

  return feature.label ?? labels[technicalObjectType] ?? "Estrutura de drenagem";
}

function resolveFeatureTechnicalObjectType(feature: Pick<DrawnFeature, "type" | "attributes">) {
  const direct = readString(feature.attributes?.technicalObjectType);
  if (direct && DRAINAGE_STRUCTURE_TYPES.has(direct as TechnicalObjectTypeId)) {
    return direct as TechnicalObjectTypeId;
  }

  const subType = readString(feature.attributes?.subType);
  if (subType && DRAINAGE_STRUCTURE_TYPES.has(subType as TechnicalObjectTypeId)) {
    return subType as TechnicalObjectTypeId;
  }

  return null;
}

export function validateDrainageSegmentGeometry(feature: Pick<DrainageSegmentFeatureLike, "coords">) {
  const normalizedCoords = normalizeLineCoords(feature.coords);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (normalizedCoords.length < 2) {
    return {
      normalizedCoords,
      lengthMeters: 0,
      errors: ["O trecho de drenagem precisa ter ao menos dois vértices válidos."],
      warnings,
    } satisfies DrainageSegmentGeometryValidation;
  }

  if (normalizedCoords.length !== feature.coords.length) {
    warnings.push("Vértices duplicados consecutivos foram ajustados para manter a linha consistente.");
  }

  const uniqueVertices = new Set(normalizedCoords.map((point) => roundCoordKey(point)));
  if (uniqueVertices.size < 2) {
    errors.push("A geometria linear não pode começar e terminar no mesmo ponto.");
  }

  const lengthMeters = comprimentoTrechoM(
    normalizedCoords.map((coord) => [coord.lat, coord.lng] as [number, number])
  );

  if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
    errors.push("Não foi possível calcular um comprimento válido para o trecho.");
  } else if (lengthMeters < MIN_LENGTH_METERS) {
    errors.push(`O trecho precisa ter pelo menos ${MIN_LENGTH_METERS} m.`);
  } else if (lengthMeters < SHORT_LENGTH_WARNING_METERS) {
    warnings.push("O trecho ficou muito curto. Confira se a geometria foi finalizada corretamente.");
  }

  try {
    const line = turf.lineString(normalizedCoords.map((coord) => [coord.lng, coord.lat]));
    const selfIntersections = turf.kinks(line);
    if (selfIntersections.features.length > 0) {
      errors.push("A geometria se cruza em si mesma. Ajuste os vértices antes de salvar.");
    }
  } catch {
    warnings.push("Não foi possível validar todos os cruzamentos da linha com segurança.");
  }

  return {
    normalizedCoords,
    lengthMeters,
    errors,
    warnings,
  } satisfies DrainageSegmentGeometryValidation;
}

function buildConnectionForPosition(
  position: "start" | "end",
  endpoint: GeoPointLike,
  availableFeatures: DrawnFeature[],
  sourceId?: string
) {
  let bestMatch: DrainageSegmentConnection | null = null;

  for (const candidate of availableFeatures) {
    if (candidate.id === sourceId || candidate.type === "line" || candidate.type === "polygon") continue;
    const technicalObjectType = resolveFeatureTechnicalObjectType(candidate);
    if (!technicalObjectType || !DRAINAGE_STRUCTURE_TYPES.has(technicalObjectType)) continue;

    const point = candidate.coords[0];
    if (!isValidPoint(point)) continue;

    const distanceMeters =
      turf.distance(turf.point([endpoint.lng, endpoint.lat]), turf.point([point.lng, point.lat]), {
        units: "kilometers",
      }) * 1000;

    if (!Number.isFinite(distanceMeters) || distanceMeters > MAX_CONNECTION_DISTANCE_METERS) {
      continue;
    }

    if (!bestMatch || distanceMeters < bestMatch.distanceMeters) {
      bestMatch = {
        featureId: candidate.id,
        label: buildDrainageConnectionLabel(candidate, technicalObjectType),
        technicalObjectType,
        position,
        distanceMeters,
      };
    }
  }

  return bestMatch;
}

export function inferDrainageSegmentConnections(args: {
  feature: DrainageSegmentFeatureLike;
  availableFeatures: DrawnFeature[];
}) {
  const geometryValidation = validateDrainageSegmentGeometry(args.feature);
  if (geometryValidation.normalizedCoords.length < 2) {
    return {
      startConnection: null,
      endConnection: null,
      connectedStructureIds: [],
    };
  }

  const startPoint = geometryValidation.normalizedCoords[0];
  const endPoint = geometryValidation.normalizedCoords[geometryValidation.normalizedCoords.length - 1];
  const startConnection = buildConnectionForPosition("start", startPoint, args.availableFeatures, args.feature.id);
  const endConnection = buildConnectionForPosition("end", endPoint, args.availableFeatures, args.feature.id);

  return {
    startConnection,
    endConnection,
    connectedStructureIds: [startConnection?.featureId, endConnection?.featureId].filter(
      (value, index, array): value is string => typeof value === "string" && array.indexOf(value) === index
    ),
  };
}

function severityFromValue(
  value: string | null,
  levels: Record<string, 0 | 1 | 2 | 3>
): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  return levels[value] ?? 0;
}

function labelFromSeverity(severity: 0 | 1 | 2 | 3) {
  return ["BAIXA", "MEDIA", "ALTA", "CRITICA"][severity] as DrainageSegmentAssessment["suggestedCriticality"];
}

function riskLabelFromSeverity(severity: 0 | 1 | 2 | 3) {
  return ["BAIXO", "MODERADO", "ALTO", "CRITICO"][severity] as DrainageSegmentAssessment["riskLevel"];
}

export function assessDrainageSegment(
  values: Record<string, string>,
  context?: Pick<DrainageSegmentAutoContext, "startConnection" | "endConnection">
) {
  const conditionSeverity = severityFromValue(values.assetCondition ?? null, {
    BOA: 0,
    REGULAR: 1,
    RUIM: 2,
    CRITICA: 3,
  });
  const operationalSeverity = severityFromValue(values.operationalStatus ?? null, {
    OPERANTE: 0,
    PARCIAL: 1,
    MANUTENCAO: 1,
    OBSTRUIDO: 3,
    INTERDITADO: 3,
  });
  const hydraulicSeverity = severityFromValue(values.hydraulicCondition ?? null, {
    OPERANTE: 0,
    MANUTENCAO: 1,
    ASSOREADA: 2,
    OBSTRUIDA: 3,
  });
  const prioritySeverity = severityFromValue(values.priority ?? null, {
    BAIXA: 0,
    MEDIA: 1,
    ALTA: 2,
    URGENTE: 3,
  });

  let criticalitySeverity = Math.max(
    conditionSeverity,
    operationalSeverity,
    hydraulicSeverity,
    prioritySeverity === 0 ? 0 : (prioritySeverity - 1) as 0 | 1 | 2 | 3
  ) as 0 | 1 | 2 | 3;

  if (!context?.startConnection || !context?.endConnection) {
    criticalitySeverity = Math.max(criticalitySeverity, 1) as 0 | 1 | 2 | 3;
  }

  const riskSeverity = Math.max(
    criticalitySeverity,
    operationalSeverity,
    hydraulicSeverity
  ) as 0 | 1 | 2 | 3;

  const reasons: string[] = [];
  if (operationalSeverity >= 3 && values.operationalStatus) reasons.push(`status ${values.operationalStatus.toLowerCase()}`);
  if (hydraulicSeverity >= 2 && values.hydraulicCondition) reasons.push(`situação hidráulica ${values.hydraulicCondition.toLowerCase()}`);
  if (conditionSeverity >= 2 && values.assetCondition) reasons.push(`condição ${values.assetCondition.toLowerCase()}`);
  if (prioritySeverity >= 2 && values.priority) reasons.push(`prioridade ${values.priority.toLowerCase()}`);
  if ((!context?.startConnection || !context?.endConnection) && reasons.length < 3) {
    reasons.push("trecho sem conexão clara nas duas extremidades");
  }

  return {
    suggestedCriticality: labelFromSeverity(criticalitySeverity),
    riskLevel: riskLabelFromSeverity(riskSeverity),
    reason: reasons.length > 0 ? reasons.join(" · ") : "Condição estável para operação rotineira.",
  } satisfies DrainageSegmentAssessment;
}

export function buildDrainageSegmentAutoContext(args: {
  feature: DrainageSegmentFeatureLike;
  baseLayersData: BaseLayerData[];
  project: DrainageSegmentProjectContext;
  currentUser: DrainageSegmentUserContext;
  availableFeatures: DrawnFeature[];
}) {
  const { feature, baseLayersData, project, currentUser, availableFeatures } = args;
  const attributes = (feature.attributes ?? {}) as Record<string, unknown>;
  const geometryValidation = validateDrainageSegmentGeometry(feature);
  const connections = inferDrainageSegmentConnections({
    feature: { ...feature, coords: geometryValidation.normalizedCoords },
    availableFeatures,
  });

  return {
    lengthMeters:
      readNumber(attributes.lengthMeters) ??
      geometryValidation.lengthMeters,
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
    geometryValidation,
    startConnection: connections.startConnection,
    endConnection: connections.endConnection,
    connectedStructureIds: connections.connectedStructureIds,
  } satisfies DrainageSegmentAutoContext;
}

export function buildDrainageSegmentSuggestedName(context: DrainageSegmentAutoContext) {
  if (context.streetName) {
    return `Trecho de drenagem · ${context.streetName}`;
  }

  if (context.startConnection && context.endConnection) {
    return `Trecho de drenagem · ${context.startConnection.label} -> ${context.endConnection.label}`;
  }

  if (context.startConnection) {
    return `Trecho de drenagem · ${context.startConnection.label}`;
  }

  if (context.neighborhood) {
    return `Trecho de drenagem · ${context.neighborhood}`;
  }

  return "Trecho de drenagem";
}

export function buildDrainageSegmentAssistAttributes(
  context: DrainageSegmentAutoContext,
  assessment?: DrainageSegmentAssessment
) {
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
    suggestedName: buildDrainageSegmentSuggestedName(context),
    geometryWarnings: context.geometryValidation.warnings,
    startStructureId: context.startConnection?.featureId ?? undefined,
    startStructureLabel: context.startConnection?.label ?? undefined,
    startStructureDistanceMeters: context.startConnection
      ? Number(context.startConnection.distanceMeters.toFixed(2))
      : undefined,
    endStructureId: context.endConnection?.featureId ?? undefined,
    endStructureLabel: context.endConnection?.label ?? undefined,
    endStructureDistanceMeters: context.endConnection
      ? Number(context.endConnection.distanceMeters.toFixed(2))
      : undefined,
    connectedStructureIds: context.connectedStructureIds,
    riskLevel: assessment?.riskLevel ?? undefined,
    riskReason: assessment?.reason ?? undefined,
    suggestedCriticality: assessment?.suggestedCriticality ?? undefined,
  };
}
