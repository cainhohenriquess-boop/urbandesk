import {
  getTechnicalObjectLabel,
  resolveTechnicalArea,
  resolveTechnicalObjectType,
  type ProjectDisciplineId,
} from "@/lib/project-disciplines";
import type { DrawnFeature } from "@/store/useMapStore";

export type SignalingMobilityFilterKey =
  | "technicalObjectType"
  | "operationCondition"
  | "conformityStatus";

export type SignalingMobilityFilterState = Record<SignalingMobilityFilterKey, string>;

export type SignalingMobilityFilterOption = {
  value: string;
  label: string;
};

export type SignalingMobilityBreakdownItem = {
  key: string;
  label: string;
  count: number;
};

export type SignalingMobilityTechnicalPanelStats = {
  totalItems: number;
  pointItems: number;
  linearItems: number;
  nonCompliantItems: number;
  criticalItems: number;
  itemsByType: SignalingMobilityBreakdownItem[];
  itemsByCondition: SignalingMobilityBreakdownItem[];
  itemsByConformity: SignalingMobilityBreakdownItem[];
};

export const EMPTY_SIGNALING_MOBILITY_FILTERS: SignalingMobilityFilterState = {
  technicalObjectType: "ALL",
  operationCondition: "ALL",
  conformityStatus: "ALL",
};

export const SIGNALING_MOBILITY_FILTER_LABELS: Record<
  SignalingMobilityFilterKey,
  string
> = {
  technicalObjectType: "Tipo",
  operationCondition: "Condição",
  conformityStatus: "Conformidade",
};

function readString(value: unknown) {
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
    BOA: "Boa",
    REGULAR: "Regular",
    RUIM: "Ruim",
    DESGASTADA: "Desgastada",
    APAGADA: "Apagada",
    INOPERANTE: "Inoperante",
    CONFORME: "Conforme",
    AJUSTE: "Requer ajuste",
    NAO_CONFORME: "Não conforme",
    A_VERIFICAR: "A verificar",
  };

  return (
    dictionary[value] ??
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (match) => match.toUpperCase())
  );
}

function matchesArea(feature: DrawnFeature, area: ProjectDisciplineId) {
  const technicalArea = resolveTechnicalArea(feature.type, feature.attributes ?? {}, null);
  return technicalArea === area;
}

function getTechnicalObjectType(feature: DrawnFeature) {
  return resolveTechnicalObjectType(feature.type, feature.attributes ?? {});
}

export function readSignalingMobilityFilterValue(
  feature: DrawnFeature,
  key: SignalingMobilityFilterKey
) {
  switch (key) {
    case "technicalObjectType":
      return getTechnicalObjectType(feature) ?? "UNSPECIFIED";
    case "operationCondition":
      return readFeatureField(feature, "operationCondition") ?? "UNSPECIFIED";
    case "conformityStatus":
      return readFeatureField(feature, "conformityStatus") ?? "UNSPECIFIED";
    default:
      return "UNSPECIFIED";
  }
}

export function getSignalingMobilityFilterOptions(
  features: DrawnFeature[],
  area: ProjectDisciplineId
) {
  const scopedFeatures = features.filter((feature) => matchesArea(feature, area));

  return (Object.keys(SIGNALING_MOBILITY_FILTER_LABELS) as SignalingMobilityFilterKey[]).reduce(
    (acc, key) => {
      const values = Array.from(
        new Set(scopedFeatures.map((feature) => readSignalingMobilityFilterValue(feature, key)))
      )
        .filter((value) => value !== "UNSPECIFIED")
        .sort((left, right) => {
          const leftLabel =
            key === "technicalObjectType" ? getTechnicalObjectLabel(left as never) : labelizeValue(left);
          const rightLabel =
            key === "technicalObjectType"
              ? getTechnicalObjectLabel(right as never)
              : labelizeValue(right);
          return leftLabel.localeCompare(rightLabel, "pt-BR");
        });

      acc[key] = values.map((value) => ({
        value,
        label:
          key === "technicalObjectType"
            ? getTechnicalObjectLabel(value as never)
            : labelizeValue(value),
      }));
      return acc;
    },
    {} as Record<SignalingMobilityFilterKey, SignalingMobilityFilterOption[]>
  );
}

function groupItems(
  features: DrawnFeature[],
  key: SignalingMobilityFilterKey
): SignalingMobilityBreakdownItem[] {
  const grouped = new Map<string, SignalingMobilityBreakdownItem>();

  for (const feature of features) {
    const rawValue = readSignalingMobilityFilterValue(feature, key);
    const current = grouped.get(rawValue) ?? {
      key: rawValue,
      label:
        key === "technicalObjectType"
          ? getTechnicalObjectLabel(rawValue as never)
          : labelizeValue(rawValue === "UNSPECIFIED" ? null : rawValue),
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

function isCriticalItem(feature: DrawnFeature) {
  const operationCondition = readFeatureField(feature, "operationCondition");
  const conformityStatus = readFeatureField(feature, "conformityStatus");
  return (
    operationCondition === "RUIM" ||
    operationCondition === "INOPERANTE" ||
    operationCondition === "APAGADA" ||
    conformityStatus === "NAO_CONFORME"
  );
}

export function getSignalingMobilityTechnicalPanelStats(
  features: DrawnFeature[],
  area: ProjectDisciplineId
): SignalingMobilityTechnicalPanelStats {
  const scopedFeatures = features.filter((feature) => matchesArea(feature, area));

  return {
    totalItems: scopedFeatures.length,
    pointItems: scopedFeatures.filter((feature) => feature.type !== "line").length,
    linearItems: scopedFeatures.filter((feature) => feature.type === "line").length,
    nonCompliantItems: scopedFeatures.filter(
      (feature) => readFeatureField(feature, "conformityStatus") === "NAO_CONFORME"
    ).length,
    criticalItems: scopedFeatures.filter(isCriticalItem).length,
    itemsByType: groupItems(scopedFeatures, "technicalObjectType"),
    itemsByCondition: groupItems(scopedFeatures, "operationCondition"),
    itemsByConformity: groupItems(scopedFeatures, "conformityStatus"),
  };
}
