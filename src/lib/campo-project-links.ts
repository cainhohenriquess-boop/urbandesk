import type {
  ProjectInspectionStatus,
  ProjectIssueStatus,
  ProjectTechnicalArea,
} from "@prisma/client";
import {
  getTechnicalObjectLabel,
  isProjectDisciplineId,
  resolveTechnicalArea,
  resolveTechnicalObjectType,
  type ProjectDisciplineId,
  type TechnicalObjectTypeId,
} from "@/lib/project-disciplines";
import { getProjectTechnicalAreaLabel } from "@/lib/project-labels";

export const CAMPO_RECORD_TYPE_VALUES = ["VISTORIA", "OCORRENCIA"] as const;
export type CampoRecordType = (typeof CAMPO_RECORD_TYPE_VALUES)[number];

export const CAMPO_INSPECTION_STATUS_VALUES = [
  "AGENDADA",
  "REALIZADA",
  "CANCELADA",
] as const satisfies readonly ProjectInspectionStatus[];
export type CampoInspectionStatus = (typeof CAMPO_INSPECTION_STATUS_VALUES)[number];

export const CAMPO_ISSUE_STATUS_VALUES = [
  "ABERTA",
  "EM_TRATATIVA",
  "RESOLVIDA",
  "FECHADA",
  "CANCELADA",
] as const satisfies readonly ProjectIssueStatus[];
export type CampoIssueStatus = (typeof CAMPO_ISSUE_STATUS_VALUES)[number];

export type CampoProjectOption = {
  id: string;
  name: string;
  code: string | null;
  technicalAreas: ProjectTechnicalArea[];
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  phases: CampoProjectPhaseOption[];
};

export type CampoProjectPhaseOption = {
  id: string;
  name: string;
  sequence: number;
  technicalArea: ProjectTechnicalArea | null;
  status: string;
};

export type CampoProjectAssetOption = {
  id: string;
  name: string;
  type: string;
  technicalArea: ProjectDisciplineId | null;
  technicalObjectType: TechnicalObjectTypeId | null;
};

export function isCampoRecordType(value: string | null | undefined): value is CampoRecordType {
  return (
    typeof value === "string" &&
    (CAMPO_RECORD_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function buildCampoProjectLabel(project: {
  code?: string | null;
  name: string;
}) {
  return project.code ? `${project.code} · ${project.name}` : project.name;
}

export function buildCampoPhaseLabel(phase: {
  sequence: number;
  name: string;
}) {
  return `Fase ${phase.sequence} · ${phase.name}`;
}

export function resolveCampoAssetTechnicalContext(asset: {
  type?: string | null;
  attributes?: unknown;
}): {
  technicalArea: ProjectDisciplineId | null;
  technicalObjectType: TechnicalObjectTypeId | null;
} {
  const attributes =
    asset.attributes && typeof asset.attributes === "object" && !Array.isArray(asset.attributes)
      ? { ...(asset.attributes as Record<string, unknown>) }
      : {};

  return {
    technicalArea: resolveTechnicalArea(asset.type ?? null, attributes, null),
    technicalObjectType: resolveTechnicalObjectType(asset.type ?? null, attributes),
  };
}

export function getCampoTechnicalAreaOptions(projectAreas: ProjectTechnicalArea[]) {
  return projectAreas
    .map((area) => ({
      value: area as ProjectDisciplineId,
      label: getProjectTechnicalAreaLabel(area),
    }));
}

export function getCampoTechnicalObjectLabel(value: TechnicalObjectTypeId | null | undefined) {
  return value ? getTechnicalObjectLabel(value) : "Não vinculado";
}
