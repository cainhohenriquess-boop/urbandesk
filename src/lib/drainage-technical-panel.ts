import { comprimentoTrechoM } from "@/lib/turf";
import { readDrainageSegmentFieldValue } from "@/lib/drainage-segment";
import type { DrawnFeature } from "@/store/useMapStore";
import { resolveTechnicalArea, resolveTechnicalObjectType } from "@/lib/project-disciplines";

const DRAINAGE_LINE_TYPES = new Set(["TRECHO_DRENAGEM", "GALERIA_PLUVIAL", "SARJETA", "CANAL"]);

export type DrainageBreakdownItem = {
  key: string;
  label: string;
  count: number;
  lengthMeters: number;
};

export type DrainageStatusItem = {
  key: string;
  label: string;
  count: number;
};

export type DrainageTechnicalPanelStats = {
  drainageItems: number;
  totalSegments: number;
  totalLengthMeters: number;
  floodingPoints: number;
  openOccurrences: number;
  criticalItems: number;
  segmentsByMaterial: DrainageBreakdownItem[];
  segmentsByCondition: DrainageBreakdownItem[];
  statusBreakdown: DrainageStatusItem[];
};

function labelize(value: string | null | undefined) {
  if (!value) return "Não informado";

  const dictionary: Record<string, string> = {
    CONCRETO: "Concreto",
    PVC: "PVC",
    PEAD: "PEAD",
    FERRO: "Ferro fundido",
    BOA: "Boa",
    REGULAR: "Regular",
    RUIM: "Ruim",
    CRITICA: "Crítica",
    OPERANTE: "Operante",
    PARCIAL: "Parcial",
    OBSTRUIDO: "Obstruído",
    INTERDITADO: "Interditado",
    MANUTENCAO: "Em manutenção",
    BAIXO: "Baixo",
    MODERADO: "Moderado",
    ALTO: "Alto",
    CRITICO: "Crítico",
  };

  return dictionary[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function isDrainageFeature(feature: DrawnFeature) {
  const technicalArea = resolveTechnicalArea(feature.type, feature.attributes ?? {}, null);
  return technicalArea === "DRENAGEM";
}

function getTechnicalObjectType(feature: DrawnFeature) {
  return resolveTechnicalObjectType(feature.type, feature.attributes ?? {});
}

function isDrainageSegment(feature: DrawnFeature) {
  const technicalObjectType = getTechnicalObjectType(feature);
  return feature.type === "line" || (technicalObjectType ? DRAINAGE_LINE_TYPES.has(technicalObjectType) : false);
}

function getSegmentLengthMeters(feature: DrawnFeature) {
  const explicitLength = Number(readDrainageSegmentFieldValue(feature.attributes ?? {}, "lengthMeters") ?? "0");
  if (Number.isFinite(explicitLength) && explicitLength > 0) {
    return explicitLength;
  }

  return comprimentoTrechoM(feature.coords.map((coord) => [coord.lat, coord.lng] as [number, number]));
}

function groupSegments(
  features: DrawnFeature[],
  key: "networkMaterial" | "assetCondition"
) {
  const grouped = new Map<string, DrainageBreakdownItem>();

  for (const feature of features) {
    const rawValue = readDrainageSegmentFieldValue(feature.attributes ?? {}, key) ?? "UNSPECIFIED";
    const current = grouped.get(rawValue) ?? {
      key: rawValue,
      label: labelize(rawValue === "UNSPECIFIED" ? null : rawValue),
      count: 0,
      lengthMeters: 0,
    };

    current.count += 1;
    current.lengthMeters += getSegmentLengthMeters(feature);
    grouped.set(rawValue, current);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lengthMeters - a.lengthMeters;
  });
}

function buildStatusBreakdown(features: DrawnFeature[]) {
  const grouped = new Map<string, DrainageStatusItem>();

  for (const feature of features) {
    const rawValue = readDrainageSegmentFieldValue(feature.attributes ?? {}, "operationalStatus") ?? "SEM_STATUS";
    const current = grouped.get(rawValue) ?? {
      key: rawValue,
      label: labelize(rawValue === "SEM_STATUS" ? null : rawValue),
      count: 0,
    };
    current.count += 1;
    grouped.set(rawValue, current);
  }

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
}

function isCriticalDrainageItem(feature: DrawnFeature) {
  const riskLevel = readDrainageSegmentFieldValue(feature.attributes ?? {}, "riskLevel");
  const criticality = readDrainageSegmentFieldValue(feature.attributes ?? {}, "criticality");
  const condition = readDrainageSegmentFieldValue(feature.attributes ?? {}, "assetCondition");
  const operationalStatus = readDrainageSegmentFieldValue(feature.attributes ?? {}, "operationalStatus");
  const occurrenceStatus = readDrainageSegmentFieldValue(feature.attributes ?? {}, "occurrenceStatus");
  const priority = readDrainageSegmentFieldValue(feature.attributes ?? {}, "priority");

  if (riskLevel === "CRITICO" || riskLevel === "ALTO") return true;
  if (criticality === "CRITICA" || criticality === "ALTA") return true;
  if (condition === "CRITICA") return true;
  if (operationalStatus === "OBSTRUIDO" || operationalStatus === "INTERDITADO") return true;
  if (occurrenceStatus === "ABERTA" && (priority === "ALTA" || priority === "CRITICA")) return true;

  return false;
}

export function getDrainageTechnicalPanelStats(features: DrawnFeature[]): DrainageTechnicalPanelStats {
  const drainageItems = features.filter(isDrainageFeature);
  const drainageSegments = drainageItems.filter(isDrainageSegment);
  const floodingPoints = drainageItems.filter(
    (feature) => getTechnicalObjectType(feature) === "PONTO_ALAGAMENTO"
  ).length;
  const openOccurrences = drainageItems.filter((feature) => {
    if (getTechnicalObjectType(feature) !== "OCORRENCIA_DRENAGEM") return false;
    const occurrenceStatus = readDrainageSegmentFieldValue(feature.attributes ?? {}, "occurrenceStatus");
    return !occurrenceStatus || occurrenceStatus !== "CONCLUIDA";
  }).length;
  const criticalItems = drainageItems.filter(isCriticalDrainageItem).length;

  return {
    drainageItems: drainageItems.length,
    totalSegments: drainageSegments.length,
    totalLengthMeters: drainageSegments.reduce((sum, feature) => sum + getSegmentLengthMeters(feature), 0),
    floodingPoints,
    openOccurrences,
    criticalItems,
    segmentsByMaterial: groupSegments(drainageSegments, "networkMaterial"),
    segmentsByCondition: groupSegments(drainageSegments, "assetCondition"),
    statusBreakdown: buildStatusBreakdown(drainageSegments),
  };
}

export function getDrainageStatusFilterLabel(value: string) {
  return value === "ALL" ? "Todos" : labelize(value);
}
