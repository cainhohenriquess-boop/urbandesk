import * as turf from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
} from "geojson";
import {
  getTechnicalObjectLabel,
  resolveTechnicalArea,
  resolveTechnicalObjectType,
  type TechnicalObjectTypeId,
} from "@/lib/project-disciplines";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";

export type ArborizationProjectContext = {
  id: string;
  name: string;
  code: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
};

export type ArborizationUserContext = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

type GeoPointLike = {
  lat: number;
  lng: number;
};

type ArborizationFeatureLike = Pick<
  DrawnFeature,
  "label" | "type" | "coords" | "attributes"
> & {
  id?: string;
  createdAt?: number;
  createdAtIso?: string;
};

export type ArborizationNearbyReference = {
  source: "PONNOT" | "PONT_ILUM" | "ASSET";
  featureId: string;
  label: string;
  technicalObjectType: TechnicalObjectTypeId | null;
  municipalityName: string | null;
  streetName: string | null;
  distanceMeters: number;
};

export type ArborizationTreeGeometryValidation = {
  point: GeoPointLike | null;
  errors: string[];
  warnings: string[];
};

export type ArborizationTreeAutoContext = {
  latitude: number | null;
  longitude: number | null;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  municipalityName: string | null;
  projectId: string;
  projectLabel: string;
  creatorId: string | null;
  creatorName: string | null;
  creatorEmail: string | null;
  creatorRole: string | null;
  createdAtIso: string;
  geometryValidation: ArborizationTreeGeometryValidation;
  nearestNetworkReference: ArborizationNearbyReference | null;
  nearestEquipmentReference: ArborizationNearbyReference | null;
  warnings: string[];
};

export type ArborizationTreeAssessment = {
  suggestedRiskLevel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  reason: string;
  warnings: string[];
};

const MAX_STREET_DISTANCE_METERS = 120;
const MAX_NETWORK_REFERENCE_DISTANCE_METERS = 18;
const MAX_EQUIPMENT_REFERENCE_DISTANCE_METERS = 24;

export const ARBORIZATION_TREE_DEFAULT_TECHNICAL_VALUES: Record<string, string> = {
  species: "",
  speciesOther: "",
  canopySize: "MEDIO",
  treeCondition: "SAUDAVEL",
  riskLevel: "BAIXO",
  trunkDiameterCm: "",
  botanicalName: "",
};

const SPECIES_LABELS: Record<string, string> = {
  OITI: "Oiti",
  IPE_AMARELO: "Ipê-amarelo",
  IPE_ROXO: "Ipê-roxo",
  JACARANDA: "Jacarandá",
  CRAIBEIRA: "Craibeira",
  SIBIPIRUNA: "Sibipiruna",
  PAU_BRASIL: "Pau-brasil",
  FICUS: "Ficus",
  NIM: "Nim",
  ALGAROBA: "Algaroba",
  CASTANHOLA: "Castanhola",
  MANGUEIRA: "Mangueira",
  COQUEIRO: "Coqueiro",
  OUTRA: "Outra espécie",
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isValidPoint(point: GeoPointLike | null | undefined): point is GeoPointLike {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function readFeatureCreatedAtIso(
  feature: ArborizationFeatureLike,
  attributes: Record<string, unknown>
) {
  return (
    readString(attributes.createdAt) ??
    readString(feature.createdAtIso) ??
    new Date(feature.createdAt ?? Date.now()).toISOString()
  );
}

function normalizePoint(feature: Pick<ArborizationFeatureLike, "coords">) {
  const point = feature.coords[0] ?? null;
  return isValidPoint(point) ? point : null;
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

type StreetCandidate =
  | { name: string; kind: "line"; geometry: Feature<LineString> }
  | { name: string; kind: "point"; geometry: Feature<Point> };

function collectStreetCandidates(baseLayersData: BaseLayerData[]) {
  const candidates: StreetCandidate[] = [];

  for (const layer of baseLayersData) {
    if (layer.type !== "STREET_NAMES" && layer.type !== "STREETS") continue;

    const geoJsonData = layer.geoJsonData as FeatureCollection | undefined;
    if (!geoJsonData || !Array.isArray(geoJsonData.features)) continue;

    for (const feature of geoJsonData.features as Array<
      Feature<LineString | MultiLineString | Point>
    >) {
      if (!feature.geometry) continue;
      const name = getStreetNameFromProperties(
        (feature.properties ?? {}) as Record<string, unknown>
      );
      if (!name) continue;

      if (feature.geometry.type === "LineString") {
        candidates.push({
          name,
          kind: "line",
          geometry: turf.lineString(feature.geometry.coordinates),
        });
        continue;
      }

      if (feature.geometry.type === "MultiLineString") {
        for (const coordinates of feature.geometry.coordinates) {
          candidates.push({
            name,
            kind: "line",
            geometry: turf.lineString(coordinates),
          });
        }
        continue;
      }

      if (feature.geometry.type === "Point") {
        candidates.push({
          name,
          kind: "point",
          geometry: turf.point(feature.geometry.coordinates),
        });
      }
    }
  }

  return candidates;
}

function inferStreetName(point: GeoPointLike | null, baseLayersData: BaseLayerData[]) {
  if (!point) return null;

  const anchor = turf.point([point.lng, point.lat]);
  const candidates = collectStreetCandidates(baseLayersData);
  let bestMatch: { name: string; distanceMeters: number } | null = null;

  for (const candidate of candidates) {
    const distanceMeters =
      candidate.kind === "line"
        ? (typeof turf.nearestPointOnLine(candidate.geometry, anchor, {
            units: "kilometers",
          }).properties?.dist === "number"
            ? turf.nearestPointOnLine(candidate.geometry, anchor, {
                units: "kilometers",
              }).properties!.dist!
            : Number.POSITIVE_INFINITY) * 1000
        : turf.distance(anchor, candidate.geometry, { units: "kilometers" }) * 1000;

    if (!Number.isFinite(distanceMeters)) continue;
    if (!bestMatch || distanceMeters < bestMatch.distanceMeters) {
      bestMatch = { name: candidate.name, distanceMeters };
    }
  }

  if (!bestMatch || bestMatch.distanceMeters > MAX_STREET_DISTANCE_METERS) {
    return null;
  }

  return bestMatch.name;
}

function buildImportedReferenceLabel(
  source: "PONNOT" | "PONT_ILUM",
  properties: Record<string, unknown>,
  index: number
) {
  if (source === "PONNOT") {
    return (
      readString(properties.COD_ID) ??
      readString(properties.identifier) ??
      readString(properties.label) ??
      `Poste ${index + 1}`
    );
  }

  return (
    readString(properties.TXT_LUM) ??
    readString(properties.label) ??
    readString(properties.identifier) ??
    `Ponto de iluminação ${index + 1}`
  );
}

function collectImportedInfrastructureReferences(baseLayersData: BaseLayerData[]) {
  const references: Array<ArborizationNearbyReference & { point: Feature<Point> }> = [];

  for (const layer of baseLayersData) {
    if (layer.type !== "PONNOT" && layer.type !== "PONT_ILUM") continue;

    const geoJsonData = layer.geoJsonData as FeatureCollection | undefined;
    if (!geoJsonData || !Array.isArray(geoJsonData.features)) continue;

    for (const [index, feature] of geoJsonData.features.entries()) {
      if (!feature?.geometry || feature.geometry.type !== "Point") continue;

      const properties =
        feature.properties && typeof feature.properties === "object"
          ? (feature.properties as Record<string, unknown>)
          : {};

      references.push({
        source: layer.type,
        featureId:
          readString(properties.id) ??
          readString(properties.identifier) ??
          `${layer.type}-${index + 1}`,
        label: buildImportedReferenceLabel(layer.type, properties, index),
        technicalObjectType: null,
        municipalityName: readString(properties.municipalityName),
        streetName: readString(properties.streetName),
        distanceMeters: 0,
        point: turf.point(feature.geometry.coordinates),
      });
    }
  }

  return references;
}

function pickNearestImportedInfrastructureReference(
  point: GeoPointLike | null,
  baseLayersData: BaseLayerData[]
) {
  if (!point) return null;

  const anchor = turf.point([point.lng, point.lat]);
  let bestMatch: ArborizationNearbyReference | null = null;

  for (const reference of collectImportedInfrastructureReferences(baseLayersData)) {
    const distanceMeters =
      turf.distance(anchor, reference.point, { units: "kilometers" }) * 1000;

    if (!Number.isFinite(distanceMeters)) continue;
    if (!bestMatch || distanceMeters < bestMatch.distanceMeters) {
      bestMatch = {
        ...reference,
        distanceMeters: Number(distanceMeters.toFixed(2)),
      };
    }
  }

  if (
    !bestMatch ||
    bestMatch.distanceMeters > MAX_NETWORK_REFERENCE_DISTANCE_METERS
  ) {
    return null;
  }

  return bestMatch;
}

function isOperationalEquipmentFeature(feature: DrawnFeature) {
  if (feature.type === "line" || feature.type === "polygon") return false;

  const technicalArea = resolveTechnicalArea(feature.type, feature.attributes ?? {}, null);
  if (technicalArea === "ARBORIZACAO") return false;

  const technicalObjectType = resolveTechnicalObjectType(feature.type, feature.attributes ?? {});
  return Boolean(technicalObjectType);
}

function pickNearestOperationalEquipmentReference(
  point: GeoPointLike | null,
  availableFeatures: DrawnFeature[],
  sourceId?: string
) {
  if (!point) return null;

  const anchor = turf.point([point.lng, point.lat]);
  let bestMatch: ArborizationNearbyReference | null = null;

  for (const feature of availableFeatures) {
    if (feature.id === sourceId || !isOperationalEquipmentFeature(feature)) continue;

    const featurePoint = normalizePoint(feature);
    if (!featurePoint) continue;

    const distanceMeters =
      turf.distance(anchor, turf.point([featurePoint.lng, featurePoint.lat]), {
        units: "kilometers",
      }) * 1000;

    if (!Number.isFinite(distanceMeters)) continue;

    const technicalObjectType = resolveTechnicalObjectType(feature.type, feature.attributes ?? {});
    const label =
      feature.label ??
      (technicalObjectType ? getTechnicalObjectLabel(technicalObjectType) : "Equipamento");

    if (!bestMatch || distanceMeters < bestMatch.distanceMeters) {
      bestMatch = {
        source: "ASSET",
        featureId: feature.id,
        label,
        technicalObjectType,
        municipalityName: readString(feature.attributes?.municipalityName),
        streetName: readString(feature.attributes?.streetName),
        distanceMeters: Number(distanceMeters.toFixed(2)),
      };
    }
  }

  if (
    !bestMatch ||
    bestMatch.distanceMeters > MAX_EQUIPMENT_REFERENCE_DISTANCE_METERS
  ) {
    return null;
  }

  return bestMatch;
}

function getSpeciesLabel(values: Record<string, string>) {
  const rawSpecies = values.species?.trim() ?? "";
  if (!rawSpecies) return null;
  if (rawSpecies === "OUTRA") {
    return values.speciesOther?.trim() || SPECIES_LABELS.OUTRA;
  }
  return SPECIES_LABELS[rawSpecies] ?? rawSpecies;
}

export function isArborizationTreeObjectType(technicalObjectType?: string | null) {
  return technicalObjectType === "ARVORE";
}

export function mergeArborizationTreeDefaultValues(values: Record<string, string>) {
  return {
    ...ARBORIZATION_TREE_DEFAULT_TECHNICAL_VALUES,
    ...Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => typeof value === "string" && value.trim().length > 0
      )
    ),
  };
}

export function validateArborizationTreeGeometry(
  feature: Pick<ArborizationFeatureLike, "coords">
): ArborizationTreeGeometryValidation {
  const point = normalizePoint(feature);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!point) {
    errors.push("A árvore precisa ser cadastrada em um ponto geográfico válido.");
  }

  if (feature.coords.length > 1) {
    warnings.push(
      "Foram encontradas coordenadas extras. O cadastro usará apenas o primeiro ponto."
    );
  }

  return {
    point,
    errors,
    warnings,
  };
}

export function buildArborizationTreeAutoContext(input: {
  feature: ArborizationFeatureLike;
  baseLayersData: BaseLayerData[];
  project: ArborizationProjectContext;
  currentUser: ArborizationUserContext;
  availableFeatures: DrawnFeature[];
}) {
  const attributes =
    input.feature.attributes && typeof input.feature.attributes === "object"
      ? (input.feature.attributes as Record<string, unknown>)
      : {};
  const geometryValidation = validateArborizationTreeGeometry(input.feature);
  const streetName =
    readString(attributes.streetName) ??
    inferStreetName(geometryValidation.point, input.baseLayersData);
  const nearestNetworkReference = pickNearestImportedInfrastructureReference(
    geometryValidation.point,
    input.baseLayersData
  );
  const nearestEquipmentReference = pickNearestOperationalEquipmentReference(
    geometryValidation.point,
    input.availableFeatures,
    input.feature.id
  );

  const warnings = [...geometryValidation.warnings];
  if (!nearestNetworkReference) {
    warnings.push("Nenhuma referência de rede importada foi encontrada nas proximidades.");
  }
  if (!nearestEquipmentReference) {
    warnings.push("Nenhum equipamento operacional próximo foi identificado no workspace.");
  }

  return {
    latitude: geometryValidation.point?.lat ?? null,
    longitude: geometryValidation.point?.lng ?? null,
    streetName,
    neighborhood: readString(attributes.neighborhood) ?? input.project.neighborhood,
    district: readString(attributes.district) ?? input.project.district,
    region: readString(attributes.region) ?? input.project.region,
    municipalityName:
      readString(attributes.municipalityName) ??
      nearestNetworkReference?.municipalityName ??
      null,
    projectId: input.project.id,
    projectLabel: input.project.code
      ? `${input.project.code} · ${input.project.name}`
      : input.project.name,
    creatorId: readString(attributes.createdById) ?? input.currentUser.id,
    creatorName:
      readString(attributes.createdByName) ??
      input.currentUser.name ??
      input.currentUser.email,
    creatorEmail: readString(attributes.createdByEmail) ?? input.currentUser.email,
    creatorRole: readString(attributes.createdByRole) ?? input.currentUser.role,
    createdAtIso: readFeatureCreatedAtIso(input.feature, attributes),
    geometryValidation,
    nearestNetworkReference,
    nearestEquipmentReference,
    warnings,
  } satisfies ArborizationTreeAutoContext;
}

function severityFromCondition(value: string | null) {
  switch (value) {
    case "ATENCAO":
      return 1;
    case "PRECISA_PODA":
      return 2;
    case "DECLINIO":
      return 2;
    case "EM_RISCO":
      return 3;
    default:
      return 0;
  }
}

function riskLabelFromSeverity(severity: number) {
  if (severity >= 3) return "CRITICO";
  if (severity >= 2) return "ALTO";
  if (severity >= 1) return "MEDIO";
  return "BAIXO";
}

export function assessArborizationTree(
  values: Record<string, string>,
  autoContext: ArborizationTreeAutoContext | null
) {
  let severity = severityFromCondition(values.treeCondition ?? null);
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (values.treeCondition === "EM_RISCO") {
    reasons.push("condição fitossanitária em risco");
  } else if (values.treeCondition === "DECLINIO") {
    reasons.push("árvore em declínio fitossanitário");
  } else if (values.treeCondition === "PRECISA_PODA") {
    reasons.push("necessidade de poda técnica");
  }

  if (
    autoContext?.nearestNetworkReference &&
    autoContext.nearestNetworkReference.distanceMeters <= 8
  ) {
    severity = Math.max(
      severity,
      values.canopySize === "GRANDE" ? 3 : 2
    );
    warnings.push("A árvore está muito próxima de rede ou poste de referência.");
    reasons.push("proximidade imediata com rede ou poste");
  } else if (
    autoContext?.nearestNetworkReference &&
    autoContext.nearestNetworkReference.distanceMeters <= 15
  ) {
    severity = Math.max(severity, 1);
    warnings.push("Existe referência de rede próxima. Vale revisar eventual conflito.");
  }

  if (
    autoContext?.nearestEquipmentReference &&
    autoContext.nearestEquipmentReference.distanceMeters <= 6
  ) {
    severity = Math.max(
      severity,
      values.canopySize === "GRANDE" ? 2 : 1
    );
    warnings.push("Há equipamento urbano muito próximo ao ponto cadastrado.");
    reasons.push("proximidade com equipamento urbano");
  }

  return {
    suggestedRiskLevel: riskLabelFromSeverity(severity),
    reason:
      reasons.length > 0
        ? reasons.join(" · ")
        : "cadastro sem criticidade espacial relevante identificada",
    warnings,
  } satisfies ArborizationTreeAssessment;
}

export function buildArborizationTreeTechnicalDefaults(input: {
  autoContext: ArborizationTreeAutoContext | null;
  currentValues: Record<string, string>;
}) {
  const nextValues = mergeArborizationTreeDefaultValues(input.currentValues);
  const assessment = assessArborizationTree(nextValues, input.autoContext);

  if (!nextValues.riskLevel.trim()) {
    nextValues.riskLevel = assessment.suggestedRiskLevel;
  }

  return {
    suggestedValues: nextValues,
    assessment,
  };
}

export function buildArborizationTreeSuggestedName(
  autoContext: ArborizationTreeAutoContext,
  values: Record<string, string>
) {
  const speciesLabel = getSpeciesLabel(values);

  if (speciesLabel && autoContext.streetName) {
    return `${speciesLabel} · ${autoContext.streetName}`;
  }

  if (speciesLabel && autoContext.neighborhood) {
    return `${speciesLabel} · ${autoContext.neighborhood}`;
  }

  if (autoContext.streetName) {
    return `Árvore · ${autoContext.streetName}`;
  }

  if (autoContext.neighborhood) {
    return `Árvore · ${autoContext.neighborhood}`;
  }

  return "Árvore";
}

export function buildArborizationTreeAssistAttributes(
  autoContext: ArborizationTreeAutoContext,
  assessment: ArborizationTreeAssessment,
  values: Record<string, string>
) {
  return {
    latitude: autoContext.latitude ?? undefined,
    longitude: autoContext.longitude ?? undefined,
    streetName: autoContext.streetName ?? undefined,
    neighborhood: autoContext.neighborhood ?? undefined,
    district: autoContext.district ?? undefined,
    region: autoContext.region ?? undefined,
    municipalityName: autoContext.municipalityName ?? undefined,
    projectId: autoContext.projectId,
    projectLabel: autoContext.projectLabel,
    createdById: autoContext.creatorId ?? undefined,
    createdByName: autoContext.creatorName ?? undefined,
    createdByEmail: autoContext.creatorEmail ?? undefined,
    createdByRole: autoContext.creatorRole ?? undefined,
    createdAt: autoContext.createdAtIso,
    sourceFlow: "ARBORIZATION_TREE_ASSISTED",
    suggestedName: buildArborizationTreeSuggestedName(autoContext, values),
    nearestNetworkSource: autoContext.nearestNetworkReference?.source ?? undefined,
    nearestNetworkReferenceId:
      autoContext.nearestNetworkReference?.featureId ?? undefined,
    nearestNetworkReferenceLabel:
      autoContext.nearestNetworkReference?.label ?? undefined,
    nearestNetworkDistanceMeters:
      autoContext.nearestNetworkReference?.distanceMeters ?? undefined,
    nearestEquipmentReferenceId:
      autoContext.nearestEquipmentReference?.featureId ?? undefined,
    nearestEquipmentReferenceLabel:
      autoContext.nearestEquipmentReference?.label ?? undefined,
    nearestEquipmentTechnicalObjectType:
      autoContext.nearestEquipmentReference?.technicalObjectType ?? undefined,
    nearestEquipmentDistanceMeters:
      autoContext.nearestEquipmentReference?.distanceMeters ?? undefined,
    proximityWarnings: [...autoContext.warnings, ...assessment.warnings],
    suggestedRiskLevel: assessment.suggestedRiskLevel,
    riskReason: assessment.reason,
  };
}
