import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";
import type { ProjectDisciplineId, TechnicalObjectTypeId } from "@/lib/project-disciplines";

export type SignalingMobilityProjectContext = {
  id: string;
  name: string;
  code: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
};

export type SignalingMobilityUserContext = {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

type SignalingMobilityFeatureLike = Pick<
  DrawnFeature,
  "label" | "type" | "coords" | "attributes"
> & {
  id?: string;
  createdAt?: number;
  createdAtIso?: string;
};

export type SignalingMobilityAutoContext = {
  technicalArea: ProjectDisciplineId;
  projectId: string;
  projectLabel: string;
  creatorId: string | null;
  creatorName: string | null;
  creatorEmail: string | null;
  creatorRole: string | null;
  createdAtIso: string;
  latitude: number | null;
  longitude: number | null;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  nearestStreetDistanceMeters: number | null;
};

export type SignalingMobilityAssessment = {
  suggestedValues: Record<string, string>;
  warnings: string[];
};

export type SignalingMobilityGeometryValidation = {
  errors: string[];
  warnings: string[];
  anchor: { lat: number; lng: number } | null;
};

export const SIGNALING_MOBILITY_TECHNICAL_OBJECT_TYPE_IDS = [
  "SEMAFORO",
  "PLACA_TRANSITO",
  "LOMBADA",
  "FAIXA_VIARIA",
  "TRAVESSIA_PEDESTRE",
  "PONTO_ONIBUS",
  "CICLOVIA_CICLOFAIXA",
  "DISPOSITIVO_VIARIO",
  "RADAR",
  "PINTURA_VIARIA",
] as const satisfies readonly TechnicalObjectTypeId[];

export type SignalingMobilityTechnicalObjectTypeId =
  (typeof SIGNALING_MOBILITY_TECHNICAL_OBJECT_TYPE_IDS)[number];

const POINT_TYPES = new Set<SignalingMobilityTechnicalObjectTypeId>([
  "SEMAFORO",
  "PLACA_TRANSITO",
  "LOMBADA",
  "PONTO_ONIBUS",
  "DISPOSITIVO_VIARIO",
  "RADAR",
]);

const LINE_TYPES = new Set<SignalingMobilityTechnicalObjectTypeId>([
  "FAIXA_VIARIA",
  "TRAVESSIA_PEDESTRE",
  "CICLOVIA_CICLOFAIXA",
  "PINTURA_VIARIA",
]);

const SIGNALING_MOBILITY_DEFAULT_VALUES: Record<string, string> = {
  operationCondition: "BOA",
  conformityStatus: "A_VERIFICAR",
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizePoint(value: { lat: number; lng: number } | null | undefined) {
  if (!value) return null;
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return null;
  return value;
}

function getFeatureCreatedAtIso(
  feature: SignalingMobilityFeatureLike,
  attributes: Record<string, unknown>
) {
  return (
    readString(attributes.createdAt) ??
    readString(feature.createdAtIso) ??
    new Date(feature.createdAt ?? Date.now()).toISOString()
  );
}

function buildFeatureAnchor(feature: SignalingMobilityFeatureLike) {
  const coords = feature.coords.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
  );

  if (coords.length === 0) return null;
  if (coords.length === 1 || (feature.type !== "line" && feature.type !== "polygon")) {
    return turf.point([coords[0].lng, coords[0].lat]);
  }

  if (feature.type === "line") {
    const line = turf.lineString(coords.map((coord) => [coord.lng, coord.lat]));
    const lengthKm = turf.length(line, { units: "kilometers" });
    if (lengthKm <= 0) return turf.point([coords[0].lng, coords[0].lat]);
    return turf.along(line, lengthKm / 2, { units: "kilometers" });
  }

  const polygonCoords = coords.map((coord) => [coord.lng, coord.lat]);
  if (polygonCoords.length < 3) return turf.point([coords[0].lng, coords[0].lat]);

  const closedRing = [...polygonCoords];
  const first = closedRing[0];
  const last = closedRing[closedRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closedRing.push(first);
  }

  return turf.centroid(turf.polygon([closedRing]));
}

function parseStreetCollection(
  layer: BaseLayerData
): FeatureCollection<Point | LineString | Polygon> {
  const raw = layer.geoJsonData as FeatureCollection<Point | LineString | Polygon> | string;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    return { type: "FeatureCollection", features: [] };
  }
  return parsed as FeatureCollection<Point | LineString | Polygon>;
}

function getStreetProperties(feature: Feature<Point | LineString | Polygon>) {
  return feature.properties && typeof feature.properties === "object"
    ? (feature.properties as Record<string, unknown>)
    : {};
}

function getStreetLabel(properties: Record<string, unknown>) {
  return (
    readString(properties.name) ??
    readString(properties.label) ??
    readString(properties.NAME) ??
    readString(properties.NOME) ??
    readString(properties.Rua) ??
    readString(properties.VIA)
  );
}

function distanceToStreetFeature(
  anchor: Feature<Point>,
  feature: Feature<Point | LineString | Polygon>
) {
  if (!feature.geometry) return null;

  if (feature.geometry.type === "Point") {
    return turf.distance(anchor, feature as Feature<Point>, { units: "kilometers" }) * 1000;
  }

  if (feature.geometry.type === "LineString") {
    return turf.pointToLineDistance(anchor, feature as Feature<LineString>, {
      units: "kilometers",
    }) * 1000;
  }

  if (feature.geometry.type === "Polygon") {
    return turf.pointToPolygonDistance(anchor, feature as Feature<Polygon>, {
      units: "kilometers",
    }) * 1000;
  }

  return null;
}

function inferStreetName(
  anchor: Feature<Point> | null,
  baseLayersData: BaseLayerData[]
) {
  if (!anchor) {
    return { streetName: null, distanceMeters: null };
  }

  let nearestStreetName: string | null = null;
  let nearestStreetDistance: number | null = null;

  for (const layer of baseLayersData) {
    if (layer.type !== "STREETS" && layer.type !== "STREET_NAMES") continue;
    const collection = parseStreetCollection(layer);

    for (const feature of collection.features) {
      const properties = getStreetProperties(feature);
      const streetName = getStreetLabel(properties);
      if (!streetName) continue;

      const distanceMeters = distanceToStreetFeature(anchor, feature);
      if (distanceMeters == null) continue;

      if (nearestStreetDistance == null || distanceMeters < nearestStreetDistance) {
        nearestStreetName = streetName;
        nearestStreetDistance = Number(distanceMeters.toFixed(2));
      }
    }
  }

  return {
    streetName: nearestStreetName,
    distanceMeters: nearestStreetDistance,
  };
}

export function isSignalingMobilityObjectType(
  technicalObjectType?: string | null
): technicalObjectType is SignalingMobilityTechnicalObjectTypeId {
  return (
    typeof technicalObjectType === "string" &&
    (SIGNALING_MOBILITY_TECHNICAL_OBJECT_TYPE_IDS as readonly string[]).includes(
      technicalObjectType
    )
  );
}

export function buildSignalingMobilityAutoContext(input: {
  feature: SignalingMobilityFeatureLike;
  baseLayersData: BaseLayerData[];
  project: SignalingMobilityProjectContext;
  currentUser: SignalingMobilityUserContext;
  technicalArea: ProjectDisciplineId;
}) {
  const attributes =
    input.feature.attributes && typeof input.feature.attributes === "object"
      ? (input.feature.attributes as Record<string, unknown>)
      : {};
  const anchorFeature = buildFeatureAnchor(input.feature);
  const anchor = anchorFeature
    ? normalizePoint({
        lng: anchorFeature.geometry.coordinates[0],
        lat: anchorFeature.geometry.coordinates[1],
      })
    : null;
  const street = inferStreetName(anchorFeature, input.baseLayersData);

  return {
    technicalArea: input.technicalArea,
    projectId: input.project.id,
    projectLabel: input.project.code
      ? `${input.project.code} · ${input.project.name}`
      : input.project.name,
    creatorId: input.currentUser.id,
    creatorName: input.currentUser.name,
    creatorEmail: input.currentUser.email,
    creatorRole: input.currentUser.role,
    createdAtIso: getFeatureCreatedAtIso(input.feature, attributes),
    latitude: anchor?.lat ?? null,
    longitude: anchor?.lng ?? null,
    streetName: street.streetName ?? readString(attributes.streetName) ?? null,
    neighborhood: readString(attributes.neighborhood) ?? input.project.neighborhood ?? null,
    district: readString(attributes.district) ?? input.project.district ?? null,
    region: readString(attributes.region) ?? input.project.region ?? null,
    nearestStreetDistanceMeters: street.distanceMeters,
  } satisfies SignalingMobilityAutoContext;
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

export function buildSignalingMobilityTechnicalDefaults(input: {
  autoContext: SignalingMobilityAutoContext | null;
  technicalObjectType: SignalingMobilityTechnicalObjectTypeId;
  currentValues: Record<string, string>;
}) {
  const nextValues = {
    ...SIGNALING_MOBILITY_DEFAULT_VALUES,
    ...Object.fromEntries(
      Object.entries(input.currentValues).filter(
        ([, value]) => typeof value === "string" && value.trim().length > 0
      )
    ),
  };
  const warnings: string[] = [];

  switch (input.technicalObjectType) {
    case "SEMAFORO":
      withSuggestedValue(nextValues, "signalMode", "VEICULAR");
      withSuggestedValue(nextValues, "controllerType", "TEMPO_FIXO");
      break;
    case "PLACA_TRANSITO":
      withSuggestedValue(nextValues, "plateCategory", "REGULAMENTACAO");
      withSuggestedValue(nextValues, "signSupport", "POSTE");
      break;
    case "LOMBADA":
      withSuggestedValue(nextValues, "trafficCalmingType", "LOMBADA");
      break;
    case "FAIXA_VIARIA":
      withSuggestedValue(nextValues, "markingType", "RETENCAO");
      break;
    case "TRAVESSIA_PEDESTRE":
      withSuggestedValue(nextValues, "crossingType", "FAIXA");
      withSuggestedValue(nextValues, "accessibilityCondition", "ADEQUADA");
      break;
    case "PONTO_ONIBUS":
      withSuggestedValue(nextValues, "stopType", "ABRIGO");
      break;
    case "CICLOVIA_CICLOFAIXA":
      withSuggestedValue(nextValues, "cyclewayType", "CICLOVIA");
      withSuggestedValue(nextValues, "segregationType", "PINTURA");
      break;
    case "DISPOSITIVO_VIARIO":
      withSuggestedValue(nextValues, "deviceType", "BALIZADOR");
      break;
    default:
      break;
  }

  if (!input.autoContext?.streetName) {
    warnings.push("Não foi possível identificar automaticamente o logradouro deste cadastro.");
  }

  if (!input.autoContext?.neighborhood && !input.autoContext?.region) {
    warnings.push("O item ficou sem contexto territorial do projeto para bairro ou região.");
  }

  return {
    suggestedValues: nextValues,
    warnings,
  } satisfies SignalingMobilityAssessment;
}

export function buildSignalingMobilitySuggestedName(
  autoContext: SignalingMobilityAutoContext,
  technicalObjectType: SignalingMobilityTechnicalObjectTypeId,
  technicalValues: Record<string, string>
) {
  const streetSuffix = autoContext.streetName
    ? ` · ${autoContext.streetName}`
    : autoContext.neighborhood
      ? ` · ${autoContext.neighborhood}`
      : "";

  switch (technicalObjectType) {
    case "PLACA_TRANSITO":
      return `Placa${streetSuffix}`;
    case "FAIXA_VIARIA":
      return `Faixa viária${streetSuffix}`;
    case "SEMAFORO":
      return `Semáforo${streetSuffix}`;
    case "LOMBADA":
      return `Lombada${streetSuffix}`;
    case "PONTO_ONIBUS":
      return `Ponto de ônibus${streetSuffix}`;
    case "TRAVESSIA_PEDESTRE":
      return `Travessia${streetSuffix}`;
    case "CICLOVIA_CICLOFAIXA":
      return `${
        technicalValues.cyclewayType === "CICLOFAIXA" ? "Ciclofaixa" : "Ciclovia"
      }${streetSuffix}`;
    case "DISPOSITIVO_VIARIO":
      return `Dispositivo viário${streetSuffix}`;
    case "RADAR":
      return `Radar${streetSuffix}`;
    case "PINTURA_VIARIA":
      return `Pintura viária${streetSuffix}`;
    default:
      return "Item de sinalização / mobilidade";
  }
}

export function buildSignalingMobilityAssistAttributes(
  autoContext: SignalingMobilityAutoContext,
  technicalObjectType: SignalingMobilityTechnicalObjectTypeId
) {
  return {
    originKind: "PROJECT_OPERATIONAL",
    linkedProjectId: autoContext.projectId,
    linkedProjectLabel: autoContext.projectLabel,
    technicalObjectType,
    subType: technicalObjectType,
    streetName: autoContext.streetName,
    neighborhood: autoContext.neighborhood,
    district: autoContext.district,
    region: autoContext.region,
    latitude: autoContext.latitude,
    longitude: autoContext.longitude,
    createdById: autoContext.creatorId,
    createdByName: autoContext.creatorName,
    createdByEmail: autoContext.creatorEmail,
    createdByRole: autoContext.creatorRole,
    createdAt: autoContext.createdAtIso,
    nearestStreetDistanceMeters: autoContext.nearestStreetDistanceMeters,
  };
}

export function validateSignalingMobilityGeometry(input: {
  coords?: Array<{ lat: number; lng: number }>;
  technicalObjectType: SignalingMobilityTechnicalObjectTypeId;
}): SignalingMobilityGeometryValidation {
  const coords = (input.coords ?? []).filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
  );
  const warnings: string[] = [];

  if (POINT_TYPES.has(input.technicalObjectType)) {
    if (coords.length === 0) {
      return {
        errors: ["O item precisa de um ponto georreferenciado válido."],
        warnings,
        anchor: null,
      };
    }

    return {
      errors: [],
      warnings,
      anchor: { lat: coords[0].lat, lng: coords[0].lng },
    };
  }

  if (LINE_TYPES.has(input.technicalObjectType)) {
    if (coords.length < 2) {
      return {
        errors: ["O item linear precisa de pelo menos dois vértices válidos."],
        warnings,
        anchor: null,
      };
    }

    if (coords.length === 2) {
      warnings.push("Considere detalhar melhor o traçado com mais vértices quando necessário.");
    }

    const line = turf.lineString(coords.map((coord) => [coord.lng, coord.lat]));
    const midpoint = turf.along(line, turf.length(line, { units: "kilometers" }) / 2, {
      units: "kilometers",
    });

    return {
      errors: [],
      warnings,
      anchor: {
        lat: midpoint.geometry.coordinates[1],
        lng: midpoint.geometry.coordinates[0],
      },
    };
  }

  return {
    errors: [],
    warnings,
    anchor: null,
  };
}
