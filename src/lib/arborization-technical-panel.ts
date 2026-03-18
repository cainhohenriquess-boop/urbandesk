import { resolveTechnicalArea, resolveTechnicalObjectType } from "@/lib/project-disciplines";
import type { DrawnFeature } from "@/store/useMapStore";

export type ArborizationFilterKey = "species" | "canopySize" | "treeCondition" | "riskLevel";
export type ArborizationFilterState = Record<ArborizationFilterKey, string>;

export type ArborizationFilterOption = {
  value: string;
  label: string;
};

export type ArborizationBreakdownItem = {
  key: string;
  label: string;
  count: number;
};

export type ArborizationTechnicalPanelStats = {
  arborizationItems: number;
  totalTrees: number;
  groupedAreas: number;
  openOccurrences: number;
  pendingSuppressions: number;
  criticalItems: number;
  itemsBySpecies: ArborizationBreakdownItem[];
  itemsByCanopy: ArborizationBreakdownItem[];
  itemsByCondition: ArborizationBreakdownItem[];
  itemsByRisk: ArborizationBreakdownItem[];
};

export const EMPTY_ARBORIZATION_FILTERS: ArborizationFilterState = {
  species: "ALL",
  canopySize: "ALL",
  treeCondition: "ALL",
  riskLevel: "ALL",
};

export const ARBORIZATION_FILTER_LABELS: Record<ArborizationFilterKey, string> = {
  species: "Espécie",
  canopySize: "Porte",
  treeCondition: "Condição",
  riskLevel: "Risco",
};

const GREEN_AREA_TYPES = new Set([
  "AGRUPAMENTO_ARBOREO",
  "CANTEIRO_ARBORIZACAO",
  "AREA_VERDE",
]);

const OPEN_OCCURRENCE_TYPES = new Set([
  "OCORRENCIA_PODA",
  "SUPRESSAO_ARBORIZACAO",
  "RISCO_QUEDA_ARBORIZACAO",
  "CONFLITO_REDE_ARBORIZACAO",
]);

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readFeatureField(feature: DrawnFeature, key: string) {
  const attributes =
    feature.attributes && typeof feature.attributes === "object"
      ? (feature.attributes as Record<string, unknown>)
      : {};
  const technicalData =
    attributes.technicalData && typeof attributes.technicalData === "object"
      ? (attributes.technicalData as Record<string, unknown>)
      : {};

  return readString(attributes[key]) ?? readString(technicalData[key]);
}

function labelizeValue(value: string | null | undefined) {
  if (!value) return "Não informado";

  const dictionary: Record<string, string> = {
    PEQUENO: "Pequeno",
    MEDIO: "Médio",
    GRANDE: "Grande",
    SAUDAVEL: "Saudável",
    PRECISA_PODA: "Precisa de poda",
    EM_RISCO: "Em risco",
    ESTAVEL: "Estável",
    BAIXO: "Baixo",
    MEDIO_RISCO: "Médio",
    ALTO: "Alto",
    CRITICO: "Crítico",
    ABERTA: "Aberta",
    EM_TRATAMENTO: "Em tratamento",
    PROGRAMADA: "Programada",
    CONCLUIDA: "Concluída",
    RESOLVIDA: "Resolvida",
    AUTORIZADA: "Autorizada",
    PENDENTE: "Pendente",
  };

  return dictionary[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function isArborizationFeature(feature: DrawnFeature) {
  const technicalArea = resolveTechnicalArea(feature.type, feature.attributes ?? {}, null);
  return technicalArea === "ARBORIZACAO";
}

function getTechnicalObjectType(feature: DrawnFeature) {
  return resolveTechnicalObjectType(feature.type, feature.attributes ?? {});
}

export function readArborizationFilterValue(
  feature: DrawnFeature,
  key: ArborizationFilterKey
) {
  switch (key) {
    case "species":
      return readFeatureField(feature, "species") ?? "UNSPECIFIED";
    case "canopySize":
      return readFeatureField(feature, "canopySize") ?? "UNSPECIFIED";
    case "treeCondition":
      return readFeatureField(feature, "treeCondition") ?? "UNSPECIFIED";
    case "riskLevel":
      return readFeatureField(feature, "riskLevel") ?? "UNSPECIFIED";
    default:
      return "UNSPECIFIED";
  }
}

export function getArborizationFilterOptions(features: DrawnFeature[]) {
  const arborizationFeatures = features.filter(isArborizationFeature);

  return (Object.keys(ARBORIZATION_FILTER_LABELS) as ArborizationFilterKey[]).reduce(
    (acc, key) => {
      const values = Array.from(
        new Set(arborizationFeatures.map((feature) => readArborizationFilterValue(feature, key)))
      )
        .filter((value) => value !== "UNSPECIFIED")
        .sort((left, right) => labelizeValue(left).localeCompare(labelizeValue(right), "pt-BR"));

      acc[key] = values.map((value) => ({
        value,
        label: labelizeValue(value),
      }));
      return acc;
    },
    {} as Record<ArborizationFilterKey, ArborizationFilterOption[]>
  );
}

function groupItems(
  features: DrawnFeature[],
  key: ArborizationFilterKey
): ArborizationBreakdownItem[] {
  const grouped = new Map<string, ArborizationBreakdownItem>();

  for (const feature of features) {
    const rawValue = readArborizationFilterValue(feature, key);
    const current = grouped.get(rawValue) ?? {
      key: rawValue,
      label: labelizeValue(rawValue === "UNSPECIFIED" ? null : rawValue),
      count: 0,
    };

    current.count += 1;
    grouped.set(rawValue, current);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, "pt-BR");
  });
}

function isCriticalArborizationItem(feature: DrawnFeature) {
  const technicalObjectType = getTechnicalObjectType(feature);
  const treeCondition = readFeatureField(feature, "treeCondition");
  const riskLevel = readFeatureField(feature, "riskLevel");
  const occurrenceStatus = readFeatureField(feature, "occurrenceStatus");

  if (technicalObjectType === "RISCO_QUEDA_ARBORIZACAO" && occurrenceStatus !== "CONCLUIDA") {
    return true;
  }

  if (treeCondition === "EM_RISCO") return true;
  if (riskLevel === "ALTO" || riskLevel === "CRITICO") return true;

  return false;
}

export function getArborizationTechnicalPanelStats(
  features: DrawnFeature[]
): ArborizationTechnicalPanelStats {
  const arborizationItems = features.filter(isArborizationFeature);
  const totalTrees = arborizationItems.filter(
    (feature) => getTechnicalObjectType(feature) === "ARVORE"
  ).length;
  const groupedAreas = arborizationItems.filter((feature) => {
    const technicalObjectType = getTechnicalObjectType(feature);
    return technicalObjectType ? GREEN_AREA_TYPES.has(technicalObjectType) : false;
  }).length;
  const openOccurrences = arborizationItems.filter((feature) => {
    const technicalObjectType = getTechnicalObjectType(feature);
    if (!technicalObjectType || !OPEN_OCCURRENCE_TYPES.has(technicalObjectType)) return false;
    const occurrenceStatus = readFeatureField(feature, "occurrenceStatus");
    return !occurrenceStatus || (occurrenceStatus !== "CONCLUIDA" && occurrenceStatus !== "RESOLVIDA");
  }).length;
  const pendingSuppressions = arborizationItems.filter((feature) => {
    if (getTechnicalObjectType(feature) !== "SUPRESSAO_ARBORIZACAO") return false;
    const occurrenceStatus = readFeatureField(feature, "occurrenceStatus");
    return !occurrenceStatus || occurrenceStatus !== "CONCLUIDA";
  }).length;
  const criticalItems = arborizationItems.filter(isCriticalArborizationItem).length;

  return {
    arborizationItems: arborizationItems.length,
    totalTrees,
    groupedAreas,
    openOccurrences,
    pendingSuppressions,
    criticalItems,
    itemsBySpecies: groupItems(arborizationItems, "species"),
    itemsByCanopy: groupItems(arborizationItems, "canopySize"),
    itemsByCondition: groupItems(arborizationItems, "treeCondition"),
    itemsByRisk: groupItems(arborizationItems, "riskLevel"),
  };
}
