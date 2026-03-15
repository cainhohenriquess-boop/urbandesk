import type { InfrastructureLayerFeatureRecord } from "@/lib/infrastructure-layer-map";
import { listInfrastructureLayerFeatures } from "@/lib/infrastructure-layer-map";
import {
  isLightingTechnicalObjectType,
  type LightingTechnicalObjectTypeId,
} from "@/lib/lighting-discipline";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";

export type LightingProjectLinkFilter = "ALL" | "LINKED" | "UNLINKED";

export type LightingInfrastructureDashboardItem = InfrastructureLayerFeatureRecord & {
  linkedOperationalCount: number;
};

export type LightingPanelBreakdownItem = {
  key: string;
  label: string;
  count: number;
};

export type LightingTechnicalPanelStats = {
  totalImportedItems: number;
  filteredImportedItems: number;
  authorizedPoles: number;
  authorizedLightingPoints: number;
  importedPoles: number;
  importedLightingPoints: number;
  circuits: string[];
  operationalPosts: number;
  operationalLightingPoints: number;
  operationalOutages: number;
  openOccurrences: number;
  operationalMaintenance: number;
  pendingMaintenance: number;
  operationalInspections: number;
  linkedOperationalItems: number;
  linkedImportedItems: number;
  unlinkedImportedItems: number;
  municipalities: LightingPanelBreakdownItem[];
  neighborhoods: LightingPanelBreakdownItem[];
  statuses: LightingPanelBreakdownItem[];
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function titleize(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function labelizeOperationalValue(value: string | null | undefined) {
  if (!value) return "Não informado";

  const dictionary: Record<string, string> = {
    OPERANTE: "Operante",
    MANUTENCAO: "Em manutenção",
    APAGADO: "Apagado",
    ATENCAO: "Em atenção",
    INTERMITENTE: "Intermitente",
    DESENERGIZADO: "Desenergizado",
    ABERTO: "Aberto",
    EM_ATENDIMENTO: "Em atendimento",
    PROGRAMADO: "Programado",
    NORMALIZADO: "Normalizado",
    ABERTA: "Aberta",
    EM_TRATAMENTO: "Em tratamento",
    PROGRAMADA: "Programada",
    CONCLUIDA: "Concluída",
  };

  return dictionary[value] ?? titleize(value);
}

function buildBreakdown(
  items: LightingInfrastructureDashboardItem[],
  pickValue: (item: LightingInfrastructureDashboardItem) => string | null,
  formatLabel: (value: string | null) => string = (value) => value ?? "Não informado"
) {
  const grouped = new Map<string, LightingPanelBreakdownItem>();

  for (const item of items) {
    const rawValue = pickValue(item);
    const key = rawValue ?? "UNSPECIFIED";
    const current = grouped.get(key) ?? {
      key,
      label: formatLabel(rawValue),
      count: 0,
    };

    current.count += 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label, "pt-BR");
  });
}

function resolveLightingType(feature: DrawnFeature): LightingTechnicalObjectTypeId | null {
  const attributes =
    feature.attributes && typeof feature.attributes === "object"
      ? (feature.attributes as Record<string, unknown>)
      : {};
  const technicalObjectType = readString(attributes.technicalObjectType);
  const subType = readString(attributes.subType);

  if (isLightingTechnicalObjectType(technicalObjectType)) return technicalObjectType;
  if (isLightingTechnicalObjectType(subType)) return subType;
  return isLightingTechnicalObjectType(feature.type) ? feature.type : null;
}

function readLightingField(feature: DrawnFeature, key: string) {
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

function isLightingFeature(feature: DrawnFeature) {
  return resolveLightingType(feature) !== null;
}

function toDashboardItems(
  baseLayersData: BaseLayerData[]
): LightingInfrastructureDashboardItem[] {
  return listInfrastructureLayerFeatures(baseLayersData).map((item) => ({
    ...item,
    linkedOperationalCount: 0,
  }));
}

export function getLightingTechnicalPanelStats(input: {
  features: DrawnFeature[];
  baseLayersData: BaseLayerData[];
  infrastructureItems?: LightingInfrastructureDashboardItem[];
  filteredInfrastructureItems?: LightingInfrastructureDashboardItem[];
}): LightingTechnicalPanelStats {
  const allImportedItems = input.infrastructureItems ?? toDashboardItems(input.baseLayersData);
  const visibleImportedItems = input.filteredInfrastructureItems ?? allImportedItems;
  const lightingFeatures = input.features.filter(isLightingFeature);
  const allCircuits = new Set<string>();

  for (const item of allImportedItems) {
    if (item.circuit) allCircuits.add(item.circuit);
  }

  for (const feature of lightingFeatures) {
    const circuit = readLightingField(feature, "powerCircuit");
    if (circuit) allCircuits.add(circuit);
  }

  const operationalPosts = lightingFeatures.filter(
    (feature) => resolveLightingType(feature) === "POSTE_LUZ"
  ).length;
  const operationalLightingPoints = lightingFeatures.filter(
    (feature) => resolveLightingType(feature) === "LUMINARIA"
  ).length;
  const operationalOutages = lightingFeatures.filter(
    (feature) => resolveLightingType(feature) === "PONTO_APAGADO"
  ).length;
  const operationalMaintenance = lightingFeatures.filter(
    (feature) => resolveLightingType(feature) === "OCORRENCIA_MANUTENCAO_ILUMINACAO"
  ).length;
  const operationalInspections = lightingFeatures.filter(
    (feature) => resolveLightingType(feature) === "ITEM_VISTORIADO_ILUMINACAO"
  ).length;
  const openOccurrences = lightingFeatures.filter((feature) => {
    if (resolveLightingType(feature) !== "PONTO_APAGADO") return false;
    const status = readLightingField(feature, "operationalStatus");
    return !status || status !== "NORMALIZADO";
  }).length;
  const pendingMaintenance = lightingFeatures.filter((feature) => {
    if (resolveLightingType(feature) !== "OCORRENCIA_MANUTENCAO_ILUMINACAO") return false;
    const status = readLightingField(feature, "occurrenceStatus");
    return !status || status !== "CONCLUIDA";
  }).length;
  const linkedOperationalItems = lightingFeatures.filter((feature) => {
    const attributes =
      feature.attributes && typeof feature.attributes === "object"
        ? (feature.attributes as Record<string, unknown>)
        : {};
    return (
      readString(attributes.referencePoleId) !== null ||
      readString(attributes.referenceLightingPointId) !== null
    );
  }).length;

  return {
    totalImportedItems: allImportedItems.length,
    filteredImportedItems: visibleImportedItems.length,
    authorizedPoles: allImportedItems.filter((item) => item.layerType === "PONNOT").length,
    authorizedLightingPoints: allImportedItems.filter((item) => item.layerType === "PONT_ILUM").length,
    importedPoles: visibleImportedItems.filter((item) => item.layerType === "PONNOT").length,
    importedLightingPoints: visibleImportedItems.filter((item) => item.layerType === "PONT_ILUM").length,
    circuits: Array.from(allCircuits).sort((left, right) => left.localeCompare(right, "pt-BR")),
    operationalPosts,
    operationalLightingPoints,
    operationalOutages,
    openOccurrences,
    operationalMaintenance,
    pendingMaintenance,
    operationalInspections,
    linkedOperationalItems,
    linkedImportedItems: visibleImportedItems.filter((item) => item.linkedOperationalCount > 0).length,
    unlinkedImportedItems: visibleImportedItems.filter((item) => item.linkedOperationalCount === 0).length,
    municipalities: buildBreakdown(visibleImportedItems, (item) => item.municipalityName),
    neighborhoods: buildBreakdown(visibleImportedItems, (item) => item.neighborhood),
    statuses: buildBreakdown(
      visibleImportedItems,
      (item) => item.operationalStatus,
      labelizeOperationalValue
    ),
  };
}

export function getLightingProjectLinkFilterLabel(value: LightingProjectLinkFilter) {
  if (value === "LINKED") return "Vinculados ao projeto";
  if (value === "UNLINKED") return "Sem vínculo";
  return "Todos os importados";
}
