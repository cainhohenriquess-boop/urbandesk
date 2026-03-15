import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiLineString, Point, Polygon } from "geojson";
import type { TechnicalObjectTypeId } from "@/lib/project-disciplines";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";

export type LightingProjectContext = {
  id: string;
  name: string;
  code: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
};

export type LightingUserContext = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

type GeoPointLike = {
  lat: number;
  lng: number;
};

type LightingFeatureLike = Pick<DrawnFeature, "label" | "type" | "coords" | "attributes"> & {
  id?: string;
  createdAt?: number;
  createdAtIso?: string;
};

export type LightingReferenceSource = "PONNOT" | "PONT_ILUM";

export type LightingReference = {
  source: LightingReferenceSource;
  featureId: string;
  identifier: string | null;
  label: string;
  circuit: string | null;
  supportType: string | null;
  lampType: string | null;
  powerWatts: number | null;
  reference: string | null;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  municipalityName: string | null;
  municipalityState: string | null;
  operationalStatus: string | null;
  distanceMeters: number;
};

export type LightingAutoContext = {
  projectId: string;
  projectLabel: string;
  creatorId: string | null;
  creatorName: string | null;
  creatorEmail: string | null;
  creatorRole: string | null;
  createdAtIso: string;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  municipalityName: string | null;
  municipalityState: string | null;
  suggestedCircuit: string | null;
  nearestPole: LightingReference | null;
  nearestLightingPoint: LightingReference | null;
};

export type LightingTechnicalPanelStats = {
  importedPoles: number;
  importedLightingPoints: number;
  circuits: string[];
  operationalPosts: number;
  operationalLightingPoints: number;
  operationalOutages: number;
  operationalMaintenance: number;
  operationalInspections: number;
  linkedOperationalItems: number;
};

export type LightingPointAssessment = {
  suggestedValues: Record<string, string>;
  warnings: string[];
};

const MAX_REFERENCE_DISTANCE_METERS = 35;

export const LIGHTING_TECHNICAL_OBJECT_TYPE_IDS = [
  "POSTE_LUZ",
  "LUMINARIA",
  "CIRCUITO_ILUMINACAO",
  "PONTO_APAGADO",
  "OCORRENCIA_MANUTENCAO_ILUMINACAO",
  "ITEM_VISTORIADO_ILUMINACAO",
] as const satisfies readonly TechnicalObjectTypeId[];

export type LightingTechnicalObjectTypeId =
  (typeof LIGHTING_TECHNICAL_OBJECT_TYPE_IDS)[number];

export const LIGHTING_DEFAULT_TECHNICAL_VALUES: Record<string, string> = {
  operationalStatus: "OPERANTE",
  lightingLifecycle: "ATIVO",
  maintenancePriority: "MEDIA",
  occurrenceStatus: "ABERTA",
  inspectionResult: "CONFORME",
};

export function isLightingTechnicalObjectType(
  technicalObjectType?: string | null
): technicalObjectType is LightingTechnicalObjectTypeId {
  return (
    typeof technicalObjectType === "string" &&
    (LIGHTING_TECHNICAL_OBJECT_TYPE_IDS as readonly string[]).includes(technicalObjectType)
  );
}

export function mergeLightingDefaultValues(values: Record<string, string>) {
  return {
    ...LIGHTING_DEFAULT_TECHNICAL_VALUES,
    ...Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => typeof value === "string" && value.trim().length > 0
      )
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

function normalizePoint(point: GeoPointLike | null | undefined) {
  if (!point) return null;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  return point;
}

function buildFeatureAnchor(feature: LightingFeatureLike) {
  const coords = feature.coords.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
  );

  if (coords.length === 0) return null;
  if (coords.length === 1 || feature.type !== "line" && feature.type !== "polygon") {
    return turf.point([coords[0].lng, coords[0].lat]);
  }

  if (feature.type === "line") {
    const line = turf.lineString(coords.map((coord) => [coord.lng, coord.lat]));
    const lengthKm = turf.length(line, { units: "kilometers" });
    if (lengthKm <= 0) return turf.point([coords[0].lng, coords[0].lat]);
    return turf.along(line, lengthKm / 2, { units: "kilometers" });
  }

  const polygonCoords = coords.map((coord) => [coord.lng, coord.lat]);
  if (polygonCoords.length < 3) {
    return turf.point([coords[0].lng, coords[0].lat]);
  }

  const closedRing = [...polygonCoords];
  const first = closedRing[0];
  const last = closedRing[closedRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closedRing.push(first);
  }

  const polygon = turf.polygon([closedRing]);
  return turf.centroid(polygon);
}

function parseInfrastructureCollection(layer: BaseLayerData) {
  const raw = layer.geoJsonData as FeatureCollection<Point | Polygon | MultiLineString> | string;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    return { type: "FeatureCollection", features: [] } as FeatureCollection<Point | Polygon | MultiLineString>;
  }
  return parsed as FeatureCollection<Point | Polygon | MultiLineString>;
}

function getFeatureProperties(feature: Feature<Point | Polygon | MultiLineString>) {
  return feature.properties && typeof feature.properties === "object"
    ? (feature.properties as Record<string, unknown>)
    : {};
}

function buildReferenceLabel(
  source: LightingReferenceSource,
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

function collectLightingReferences(baseLayersData: BaseLayerData[]) {
  const references: LightingReference[] = [];
  let importedPoles = 0;
  let importedLightingPoints = 0;
  const circuits = new Set<string>();

  for (const layer of baseLayersData) {
    if (layer.type !== "PONNOT" && layer.type !== "PONT_ILUM") continue;

    const collection = parseInfrastructureCollection(layer);
    collection.features.forEach((feature, index) => {
      if (!feature.geometry || feature.geometry.type !== "Point") return;

      const properties = getFeatureProperties(feature);
      const source = layer.type as LightingReferenceSource;
      const label = buildReferenceLabel(source, properties, index);
      const circuit =
        readString(properties.circuit) ??
        readString(properties.CIRCUITO) ??
        readString(properties.powerCircuit);

      if (source === "PONNOT") importedPoles += 1;
      if (source === "PONT_ILUM") importedLightingPoints += 1;
      if (circuit) circuits.add(circuit);

      references.push({
        source,
        featureId:
          readString(properties.id) ??
          readString(properties.identifier) ??
          `${source}-${index + 1}`,
        identifier:
          readString(properties.identifier) ??
          readString(properties.COD_ID) ??
          readString(properties.CODIGO),
        label,
        circuit,
        supportType: readString(properties.supportType),
        lampType: readString(properties.lampType),
        powerWatts: readNumber(properties.powerWatts),
        reference: readString(properties.reference),
        streetName: readString(properties.streetName),
        neighborhood: readString(properties.neighborhood),
        district: readString(properties.district),
        region: readString(properties.region),
        municipalityName: readString(properties.municipalityName),
        municipalityState: readString(properties.municipalityState),
        operationalStatus: readString(properties.operationalStatus),
        distanceMeters: 0,
      });
    });
  }

  return {
    references,
    importedPoles,
    importedLightingPoints,
    circuits: Array.from(circuits).sort((left, right) => left.localeCompare(right, "pt-BR")),
  };
}

function enrichReferenceDistances(
  anchor: Feature<Point> | null,
  references: LightingReference[],
  pointLookup: Map<string, [number, number]>
) {
  if (!anchor) return references;

  return references.map((reference) => {
    const coords = pointLookup.get(reference.featureId);
    if (!coords) return reference;

    const referencePoint = turf.point(coords);
    const distanceMeters =
      turf.distance(anchor, referencePoint, { units: "kilometers" }) * 1000;

    return {
      ...reference,
      distanceMeters: Number(distanceMeters.toFixed(2)),
    };
  });
}

function collectLightingReferenceGeometry(baseLayersData: BaseLayerData[]) {
  const pointLookup = new Map<string, [number, number]>();

  for (const layer of baseLayersData) {
    if (layer.type !== "PONNOT" && layer.type !== "PONT_ILUM") continue;
    const collection = parseInfrastructureCollection(layer);

    collection.features.forEach((feature, index) => {
      if (!feature.geometry || feature.geometry.type !== "Point") return;
      const properties = getFeatureProperties(feature);
      const identifier =
        readString(properties.id) ??
        readString(properties.identifier) ??
        `${layer.type}-${index + 1}`;
      pointLookup.set(identifier, [
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1],
      ]);
    });
  }

  return pointLookup;
}

function pickNearestReference(
  references: LightingReference[],
  source: LightingReferenceSource
) {
  const candidates = references
    .filter((reference) => reference.source === source)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  const nearest = candidates[0] ?? null;
  if (!nearest || nearest.distanceMeters > MAX_REFERENCE_DISTANCE_METERS) {
    return null;
  }

  return nearest;
}

function getFeatureCreatedAtIso(
  feature: LightingFeatureLike,
  attributes: Record<string, unknown>
) {
  return (
    readString(attributes.createdAt) ??
    readString(feature.createdAtIso) ??
    new Date(feature.createdAt ?? Date.now()).toISOString()
  );
}

export function buildLightingAutoContext(input: {
  feature: LightingFeatureLike;
  baseLayersData: BaseLayerData[];
  project: LightingProjectContext;
  currentUser: LightingUserContext;
}) {
  const referencesData = collectLightingReferences(input.baseLayersData);
  const pointLookup = collectLightingReferenceGeometry(input.baseLayersData);
  const anchor = buildFeatureAnchor(input.feature);
  const referencesWithDistance = enrichReferenceDistances(
    anchor,
    referencesData.references,
    pointLookup
  );
  const nearestPole = pickNearestReference(referencesWithDistance, "PONNOT");
  const nearestLightingPoint = pickNearestReference(referencesWithDistance, "PONT_ILUM");
  const attributes =
    input.feature.attributes && typeof input.feature.attributes === "object"
      ? (input.feature.attributes as Record<string, unknown>)
      : {};

  return {
    projectId: input.project.id,
    projectLabel: input.project.code
      ? `${input.project.code} · ${input.project.name}`
      : input.project.name,
    creatorId: input.currentUser.id,
    creatorName: input.currentUser.name,
    creatorEmail: input.currentUser.email,
    creatorRole: input.currentUser.role,
    createdAtIso: getFeatureCreatedAtIso(input.feature, attributes),
    streetName:
      nearestLightingPoint?.streetName ??
      nearestPole?.streetName ??
      readString(attributes.streetName) ??
      null,
    neighborhood:
      nearestLightingPoint?.neighborhood ??
      nearestPole?.neighborhood ??
      input.project.neighborhood ??
      null,
    district:
      nearestLightingPoint?.district ??
      nearestPole?.district ??
      input.project.district ??
      null,
    region:
      nearestLightingPoint?.region ??
      nearestPole?.region ??
      input.project.region ??
      null,
    municipalityName:
      nearestLightingPoint?.municipalityName ??
      nearestPole?.municipalityName ??
      null,
    municipalityState:
      nearestLightingPoint?.municipalityState ??
      nearestPole?.municipalityState ??
      null,
    suggestedCircuit:
      nearestLightingPoint?.circuit ??
      nearestPole?.circuit ??
      readString(attributes.powerCircuit) ??
      null,
    nearestPole,
    nearestLightingPoint,
  } satisfies LightingAutoContext;
}

export function buildLightingSuggestedName(
  autoContext: LightingAutoContext,
  technicalObjectType: LightingTechnicalObjectTypeId,
  technicalValues: Record<string, string>
) {
  const circuit =
    readString(technicalValues.powerCircuit) ?? autoContext.suggestedCircuit;
  const poleLabel = autoContext.nearestPole?.label ?? autoContext.nearestPole?.identifier;
  const lightLabel =
    autoContext.nearestLightingPoint?.label ?? autoContext.nearestLightingPoint?.identifier;

  switch (technicalObjectType) {
    case "POSTE_LUZ":
      return poleLabel ? `Poste operacional · ${poleLabel}` : "Poste operacional";
    case "LUMINARIA":
      return lightLabel
        ? `Ponto de iluminação · ${lightLabel}`
        : "Ponto de iluminação";
    case "CIRCUITO_ILUMINACAO":
      return circuit ? `Circuito ${circuit}` : "Circuito de iluminação";
    case "PONTO_APAGADO":
      return lightLabel ? `Ponto apagado · ${lightLabel}` : "Ponto apagado";
    case "OCORRENCIA_MANUTENCAO_ILUMINACAO":
      return lightLabel
        ? `Ocorrência de manutenção · ${lightLabel}`
        : "Ocorrência de manutenção";
    case "ITEM_VISTORIADO_ILUMINACAO":
      return lightLabel ? `Item vistoriado · ${lightLabel}` : "Item vistoriado";
    default:
      return "Item de iluminação";
  }
}

export function buildLightingAssistAttributes(
  autoContext: LightingAutoContext,
  technicalObjectType: LightingTechnicalObjectTypeId,
  technicalValues: Record<string, string>
) {
  const circuit =
    readString(technicalValues.powerCircuit) ?? autoContext.suggestedCircuit;

  return {
    originKind: "PROJECT_OPERATIONAL",
    lightingDataSource:
      autoContext.nearestPole || autoContext.nearestLightingPoint
        ? "INFRASTRUCTURE_REFERENCE"
        : "MANUAL_OPERATIONAL",
    linkedProjectId: autoContext.projectId,
    linkedProjectLabel: autoContext.projectLabel,
    technicalObjectType,
    subType: technicalObjectType,
    powerCircuit: circuit,
    streetName: autoContext.streetName,
    neighborhood: autoContext.neighborhood,
    district: autoContext.district,
    region: autoContext.region,
    municipalityName: autoContext.municipalityName,
    municipalityState: autoContext.municipalityState,
    referencePoleId: autoContext.nearestPole?.featureId ?? null,
    referencePoleLabel: autoContext.nearestPole?.label ?? null,
    referencePoleIdentifier: autoContext.nearestPole?.identifier ?? null,
    referencePoleDistanceMeters: autoContext.nearestPole?.distanceMeters ?? null,
    referenceLightingPointId: autoContext.nearestLightingPoint?.featureId ?? null,
    referenceLightingPointLabel: autoContext.nearestLightingPoint?.label ?? null,
    referenceLightingPointIdentifier: autoContext.nearestLightingPoint?.identifier ?? null,
    referenceLightingPointDistanceMeters:
      autoContext.nearestLightingPoint?.distanceMeters ?? null,
    importedLayerCodes: [
      ...(autoContext.nearestPole ? ["PONNOT"] : []),
      ...(autoContext.nearestLightingPoint ? ["PONT_ILUM"] : []),
    ],
    createdById: autoContext.creatorId,
    createdByName: autoContext.creatorName,
    createdByEmail: autoContext.creatorEmail,
    createdByRole: autoContext.creatorRole,
    createdAt: autoContext.createdAtIso,
  };
}

function normalizeUpperText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeSupportMaterial(rawValue: string | null) {
  if (!rawValue) return null;
  const normalized = normalizeUpperText(rawValue);
  if (normalized.includes("CONCRE")) return "CONCRETO";
  if (normalized.includes("METAL") || normalized.includes("ACO")) return "METALICO";
  if (normalized.includes("MADEIR")) return "MADEIRA";
  if (normalized.includes("FIBRA") || normalized.includes("COMPOS")) return "FIBRA";
  return null;
}

function normalizeLuminaireType(rawValue: string | null) {
  if (!rawValue) return null;
  const normalized = normalizeUpperText(rawValue);
  if (normalized.includes("LED")) return "LED";
  if (normalized.includes("SODIO")) return "VAPOR_SODIO";
  if (normalized.includes("METAL")) return "VAPOR_METALICO";
  if (normalized.includes("SOLAR")) return "SOLAR";
  return null;
}

function normalizeLightingOperationalStatus(
  rawValue: string | null,
  technicalObjectType: LightingTechnicalObjectTypeId
) {
  const normalized = rawValue ? normalizeUpperText(rawValue) : "";

  switch (technicalObjectType) {
    case "POSTE_LUZ":
      if (normalized.includes("DESAT")) return "DESATIVADO";
      if (normalized.includes("MANUT") || normalized.includes("ATEN")) return "ATENCAO";
      if (normalized.includes("DAN")) return "DANIFICADO";
      return "OPERANTE";
    case "LUMINARIA":
      if (normalized.includes("APAG")) return "APAGADO";
      if (normalized.includes("PARC")) return "PARCIAL";
      if (normalized.includes("MANUT")) return "MANUTENCAO";
      return "OPERANTE";
    case "CIRCUITO_ILUMINACAO":
      if (normalized.includes("DESENERG") || normalized.includes("DESAT")) {
        return "DESENERGIZADO";
      }
      if (normalized.includes("INTER")) return "INTERMITENTE";
      if (normalized.includes("MANUT") || normalized.includes("ATEN")) return "ATENCAO";
      return "OPERANTE";
    case "PONTO_APAGADO":
      if (normalized.includes("NORMAL")) return "NORMALIZADO";
      if (normalized.includes("PROG")) return "PROGRAMADO";
      if (normalized.includes("ATEND")) return "EM_ATENDIMENTO";
      return "ABERTO";
    case "OCORRENCIA_MANUTENCAO_ILUMINACAO":
      if (normalized.includes("CONCL")) return "CONCLUIDA";
      if (normalized.includes("PROG")) return "PROGRAMADA";
      if (normalized.includes("TRAT")) return "EM_TRATAMENTO";
      return "ABERTA";
    case "ITEM_VISTORIADO_ILUMINACAO":
      if (normalized.includes("CONCL")) return "CONCLUIDO";
      if (normalized.includes("ANAL")) return "EM_ANALISE";
      if (normalized.includes("ENCAM")) return "ENCAMINHADO";
      return "REGISTRADO";
    default:
      return null;
  }
}

function withSuggestedValue(
  nextValues: Record<string, string>,
  key: string,
  value: string | null | undefined
) {
  if (!value) return;
  if (typeof nextValues[key] === "string" && nextValues[key].trim().length > 0) return;
  nextValues[key] = value;
}

export function buildLightingTechnicalDefaults(input: {
  autoContext: LightingAutoContext | null;
  technicalObjectType: LightingTechnicalObjectTypeId;
  currentValues: Record<string, string>;
}) {
  const nextValues = mergeLightingDefaultValues(input.currentValues);
  const warnings: string[] = [];
  const nearestPole = input.autoContext?.nearestPole ?? null;
  const nearestLightingPoint = input.autoContext?.nearestLightingPoint ?? null;
  const importedStatus =
    nearestLightingPoint?.operationalStatus ?? nearestPole?.operationalStatus ?? null;

  withSuggestedValue(
    nextValues,
    "assetOrigin",
    nearestPole || nearestLightingPoint ? "IMPORTADO_REFERENCIADO" : "OPERACIONAL_NOVO"
  );
  withSuggestedValue(nextValues, "powerCircuit", input.autoContext?.suggestedCircuit);

  if (input.technicalObjectType === "POSTE_LUZ") {
    withSuggestedValue(
      nextValues,
      "supportMaterial",
      normalizeSupportMaterial(nearestPole?.supportType ?? null)
    );
  }

  if (input.technicalObjectType === "LUMINARIA") {
    withSuggestedValue(
      nextValues,
      "luminaireType",
      normalizeLuminaireType(nearestLightingPoint?.lampType ?? null)
    );
    withSuggestedValue(
      nextValues,
      "powerWatts",
      nearestLightingPoint?.powerWatts != null ? String(nearestLightingPoint.powerWatts) : null
    );
  }

  if (input.technicalObjectType === "PONTO_APAGADO") {
    withSuggestedValue(nextValues, "outageType", "APAGADO_TOTAL");
    withSuggestedValue(
      nextValues,
      "maintenancePriority",
      importedStatus && normalizeUpperText(importedStatus).includes("APAG")
        ? "ALTA"
        : "MEDIA"
    );
  }

  if (input.technicalObjectType === "OCORRENCIA_MANUTENCAO_ILUMINACAO") {
    withSuggestedValue(nextValues, "maintenanceType", "CORRETIVA");
    withSuggestedValue(nextValues, "occurrenceStatus", "ABERTA");
    withSuggestedValue(nextValues, "maintenancePriority", "MEDIA");
  }

  if (input.technicalObjectType === "ITEM_VISTORIADO_ILUMINACAO") {
    withSuggestedValue(nextValues, "inspectionResult", "CONFORME");
  }

  withSuggestedValue(
    nextValues,
    "operationalStatus",
    normalizeLightingOperationalStatus(importedStatus, input.technicalObjectType)
  );

  if (!nearestPole && input.technicalObjectType !== "CIRCUITO_ILUMINACAO") {
    warnings.push("Nenhum poste importado próximo foi identificado para este item.");
  }

  if (
    !nearestLightingPoint &&
    (input.technicalObjectType === "LUMINARIA" ||
      input.technicalObjectType === "PONTO_APAGADO" ||
      input.technicalObjectType === "OCORRENCIA_MANUTENCAO_ILUMINACAO" ||
      input.technicalObjectType === "ITEM_VISTORIADO_ILUMINACAO")
  ) {
    warnings.push("Nenhum ponto importado de iluminação foi identificado nas proximidades.");
  }

  return {
    suggestedValues: nextValues,
    warnings,
  } satisfies LightingPointAssessment;
}

export function getLightingTechnicalPanelStats(input: {
  features: DrawnFeature[];
  baseLayersData: BaseLayerData[];
}) {
  const imported = collectLightingReferences(input.baseLayersData);
  const allCircuits = new Set(imported.circuits);
  const resolveLightingType = (feature: DrawnFeature) => {
    const technicalObjectType = readString(feature.attributes?.technicalObjectType);
    const subType = readString(feature.attributes?.subType);
    if (isLightingTechnicalObjectType(technicalObjectType)) return technicalObjectType;
    if (isLightingTechnicalObjectType(subType)) return subType;
    return isLightingTechnicalObjectType(feature.type) ? feature.type : null;
  };
  const lightingFeatures = input.features.filter((feature) => {
    const attributes =
      feature.attributes && typeof feature.attributes === "object"
        ? (feature.attributes as Record<string, unknown>)
        : {};
    const direct =
      readString(attributes.technicalObjectType) ??
      readString(attributes.subType) ??
      (isLightingTechnicalObjectType(feature.type) ? feature.type : null);
    return isLightingTechnicalObjectType(direct);
  });

  for (const feature of lightingFeatures) {
    const circuit =
      readString(feature.attributes?.powerCircuit) ??
      readString(feature.attributes?.technicalData?.powerCircuit);
    if (circuit) allCircuits.add(circuit);
  }

  return {
    importedPoles: imported.importedPoles,
    importedLightingPoints: imported.importedLightingPoints,
    circuits: Array.from(allCircuits).sort((left, right) =>
      left.localeCompare(right, "pt-BR")
    ),
    operationalPosts: lightingFeatures.filter((feature) => {
      const technicalObjectType = resolveLightingType(feature);
      return technicalObjectType === "POSTE_LUZ";
    }).length,
    operationalLightingPoints: lightingFeatures.filter((feature) => {
      const technicalObjectType = resolveLightingType(feature);
      return technicalObjectType === "LUMINARIA";
    }).length,
    operationalOutages: lightingFeatures.filter((feature) => {
      const technicalObjectType = resolveLightingType(feature);
      return technicalObjectType === "PONTO_APAGADO";
    }).length,
    operationalMaintenance: lightingFeatures.filter((feature) => {
      const technicalObjectType = resolveLightingType(feature);
      return technicalObjectType === "OCORRENCIA_MANUTENCAO_ILUMINACAO";
    }).length,
    operationalInspections: lightingFeatures.filter((feature) => {
      const technicalObjectType = resolveLightingType(feature);
      return technicalObjectType === "ITEM_VISTORIADO_ILUMINACAO";
    }).length,
    linkedOperationalItems: lightingFeatures.filter((feature) => {
      const attributes =
        feature.attributes && typeof feature.attributes === "object"
          ? (feature.attributes as Record<string, unknown>)
          : {};
      return (
        readString(attributes.referencePoleId) !== null ||
        readString(attributes.referenceLightingPointId) !== null
      );
    }).length,
  } satisfies LightingTechnicalPanelStats;
}

