type PavementSurfaceCondition = "BOA" | "REGULAR" | "RUIM" | "CRITICA";
type PavementPriority = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export type PavementRoadSegmentAssessment = {
  effectiveWidthMeters: number | null;
  widthWasEstimated: boolean;
  areaSqm: number | null;
  estimatedUnitCostSqm: number | null;
  estimatedTotalCost: number | null;
  suggestedSurfaceCondition: PavementSurfaceCondition;
  suggestedPriority: PavementPriority;
  warnings: string[];
  errors: string[];
};

type PavementSummaryAsset = {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
};

export type PavementProjectSummary = {
  totalRoadSegments: number;
  totalLengthMeters: number;
  totalAreaSqm: number;
  totalEstimatedCost: number;
  criticalSegments: number;
  conditionCounts: Record<PavementSurfaceCondition, number>;
  pavementTypeCounts: Record<string, number>;
};

const HIERARCHY_DEFAULT_WIDTHS: Record<string, number> = {
  LOCAL: 7,
  COLETORA: 10,
  ARTERIAL: 14,
  CORREDOR: 18,
  RURAL: 6,
};

const LANE_WIDTHS: Record<string, number> = {
  LOCAL: 3,
  COLETORA: 3.2,
  ARTERIAL: 3.5,
  CORREDOR: 3.5,
  RURAL: 3.2,
};

const PAVEMENT_UNIT_COSTS: Record<string, Record<string, number>> = {
  ASFALTO: {
    IMPLANTACAO: 185,
    RECUPERACAO: 140,
    MANUTENCAO: 95,
    REQUALIFICACAO: 165,
  },
  INTERTRAVADO: {
    IMPLANTACAO: 210,
    RECUPERACAO: 165,
    MANUTENCAO: 120,
    REQUALIFICACAO: 190,
  },
  CONCRETO: {
    IMPLANTACAO: 265,
    RECUPERACAO: 210,
    MANUTENCAO: 160,
    REQUALIFICACAO: 235,
  },
  PARALELEPIPEDO: {
    IMPLANTACAO: 175,
    RECUPERACAO: 135,
    MANUTENCAO: 100,
    REQUALIFICACAO: 150,
  },
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function estimatePavementRoadWidth(values: Record<string, unknown>) {
  const hierarchy = readString(values.roadHierarchy) ?? "LOCAL";
  const laneCount = readNumber(values.laneCount);

  if (laneCount && laneCount > 0) {
    const laneWidth = LANE_WIDTHS[hierarchy] ?? 3;
    return round2(Math.max(3, laneCount * laneWidth));
  }

  return HIERARCHY_DEFAULT_WIDTHS[hierarchy] ?? 7;
}

export function resolvePavementRoadWidth(values: Record<string, unknown>) {
  const widthSource = readString(values.widthSource) ?? "ESTIMADA";
  const manualWidth = readNumber(values.widthMeters);

  if (widthSource === "INFORMADA") {
    return {
      widthMeters: manualWidth,
      widthWasEstimated: false,
    };
  }

  return {
    widthMeters: estimatePavementRoadWidth(values),
    widthWasEstimated: true,
  };
}

export function suggestPavementSurfaceCondition(values: Record<string, unknown>): PavementSurfaceCondition {
  const operationalStatus = readString(values.operationalStatus);
  const interventionType = readString(values.interventionType);

  if (operationalStatus === "BLOQUEADO") return "CRITICA";
  if (operationalStatus === "MEIA_PISTA") return "RUIM";
  if (interventionType === "RECUPERACAO" || interventionType === "REQUALIFICACAO") return "RUIM";
  if (operationalStatus === "EM_OBRA") return "REGULAR";
  if (interventionType === "IMPLANTACAO") return "BOA";
  return "REGULAR";
}

export function suggestPavementPriority(
  values: Record<string, unknown>,
  condition = suggestPavementSurfaceCondition(values)
): PavementPriority {
  const hierarchy = readString(values.roadHierarchy);
  const operationalStatus = readString(values.operationalStatus);

  if (operationalStatus === "BLOQUEADO" || condition === "CRITICA") return "URGENTE";
  if (operationalStatus === "MEIA_PISTA" || condition === "RUIM") {
    return hierarchy === "ARTERIAL" || hierarchy === "CORREDOR" ? "URGENTE" : "ALTA";
  }
  if (condition === "REGULAR") {
    return hierarchy === "ARTERIAL" || hierarchy === "CORREDOR" ? "ALTA" : "MEDIA";
  }
  return "BAIXA";
}

export function estimatePavementUnitCost(values: Record<string, unknown>) {
  const manual = readNumber(values.estimatedUnitCostSqm);
  if (manual && manual > 0) return round2(manual);

  const pavementType = readString(values.pavementType) ?? "ASFALTO";
  const interventionType = readString(values.interventionType) ?? "MANUTENCAO";
  return PAVEMENT_UNIT_COSTS[pavementType]?.[interventionType] ?? null;
}

export function assessPavementRoadSegment(
  values: Record<string, unknown>,
  options: { lengthMeters: number }
): PavementRoadSegmentAssessment {
  const warnings: string[] = [];
  const errors: string[] = [];
  const { widthMeters, widthWasEstimated } = resolvePavementRoadWidth(values);
  const widthSource = readString(values.widthSource) ?? "ESTIMADA";

  if (widthSource === "INFORMADA" && (!widthMeters || widthMeters <= 0)) {
    errors.push("Informe uma largura válida ou volte o modo de largura para estimada.");
  }

  if (widthMeters && widthMeters > 60) {
    warnings.push("A largura informada está alta para um trecho viário comum. Revise o valor.");
  }

  if (widthWasEstimated) {
    warnings.push("A largura foi estimada automaticamente a partir da hierarquia e do número de faixas.");
  }

  const effectiveWidthMeters = widthMeters && widthMeters > 0 ? widthMeters : null;
  const areaSqm =
    effectiveWidthMeters && options.lengthMeters > 0
      ? round2(options.lengthMeters * effectiveWidthMeters)
      : null;
  const estimatedUnitCostSqm = estimatePavementUnitCost(values);
  const estimatedTotalCost =
    areaSqm !== null && estimatedUnitCostSqm !== null ? round2(areaSqm * estimatedUnitCostSqm) : null;
  const suggestedSurfaceCondition = suggestPavementSurfaceCondition(values);
  const suggestedPriority = suggestPavementPriority(values, suggestedSurfaceCondition);

  return {
    effectiveWidthMeters,
    widthWasEstimated,
    areaSqm,
    estimatedUnitCostSqm,
    estimatedTotalCost,
    suggestedSurfaceCondition,
    suggestedPriority,
    warnings,
    errors,
  };
}

function readAttrString(attributes: Record<string, unknown>, key: string) {
  const technicalData =
    attributes.technicalData && typeof attributes.technicalData === "object" && !Array.isArray(attributes.technicalData)
      ? (attributes.technicalData as Record<string, unknown>)
      : null;

  return readString(technicalData?.[key]) ?? readString(attributes[key]);
}

function readAttrNumber(attributes: Record<string, unknown>, key: string) {
  const technicalData =
    attributes.technicalData && typeof attributes.technicalData === "object" && !Array.isArray(attributes.technicalData)
      ? (attributes.technicalData as Record<string, unknown>)
      : null;

  return readNumber(technicalData?.[key]) ?? readNumber(attributes[key]);
}

export function summarizePavementProjectAssets(assets: PavementSummaryAsset[]): PavementProjectSummary {
  const initialConditions: Record<PavementSurfaceCondition, number> = {
    BOA: 0,
    REGULAR: 0,
    RUIM: 0,
    CRITICA: 0,
  };

  return assets.reduce<PavementProjectSummary>(
    (acc, asset) => {
      const technicalObjectType =
        readAttrString(asset.attributes, "technicalObjectType") ??
        readAttrString(asset.attributes, "subType");
      if (technicalObjectType !== "TRECHO_PAVIMENTO") return acc;

      acc.totalRoadSegments += 1;

      const lengthMeters = readAttrNumber(asset.attributes, "lengthMeters") ?? 0;
      const areaSqm = readAttrNumber(asset.attributes, "areaSqm") ?? 0;
      const estimatedTotalCost = readAttrNumber(asset.attributes, "estimatedTotalCost") ?? 0;
      const condition = readAttrString(asset.attributes, "surfaceCondition") as
        | PavementSurfaceCondition
        | null;
      const pavementType = readAttrString(asset.attributes, "pavementType") ?? "NÃO INFORMADO";
      const criticality = readAttrString(asset.attributes, "criticality");

      acc.totalLengthMeters += lengthMeters;
      acc.totalAreaSqm += areaSqm;
      acc.totalEstimatedCost += estimatedTotalCost;
      if (condition && acc.conditionCounts[condition] !== undefined) {
        acc.conditionCounts[condition] += 1;
      }
      acc.pavementTypeCounts[pavementType] = (acc.pavementTypeCounts[pavementType] ?? 0) + 1;
      if (condition === "CRITICA" || criticality === "CRITICA" || criticality === "ALTA") {
        acc.criticalSegments += 1;
      }

      return acc;
    },
    {
      totalRoadSegments: 0,
      totalLengthMeters: 0,
      totalAreaSqm: 0,
      totalEstimatedCost: 0,
      criticalSegments: 0,
      conditionCounts: initialConditions,
      pavementTypeCounts: {},
    }
  );
}
