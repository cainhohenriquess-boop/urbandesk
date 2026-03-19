import { PROJECT_PRIORITY_VALUES, type ProjectPriorityValue } from "@/lib/project-portfolio";
import {
  getProjectDisciplineLabel,
  type ProjectDisciplineId,
} from "@/lib/project-disciplines";

export const CAMPO_CHECKLIST_STATUS_VALUES = [
  "CONFORME",
  "NAO_CONFORME",
  "NAO_SE_APLICA",
] as const;

export type CampoChecklistStatus = (typeof CAMPO_CHECKLIST_STATUS_VALUES)[number];

export type CampoChecklistItemDefinition = {
  id: string;
  label: string;
};

export type CampoChecklistEntry = {
  itemId: string;
  status: CampoChecklistStatus;
};

type SupportedChecklistArea =
  | "DRENAGEM"
  | "PAVIMENTACAO"
  | "ILUMINACAO"
  | "ARBORIZACAO";

type CampoChecklistDefinition = {
  area: SupportedChecklistArea;
  title: string;
  description: string;
  issueLabel: string;
  items: CampoChecklistItemDefinition[];
};

type CampoChecklistSummary = {
  answeredCount: number;
  conformingCount: number;
  nonConformingCount: number;
  notApplicableCount: number;
  nonConformityLabels: string[];
};

const CAMPO_CHECKLIST_DEFINITIONS: Record<SupportedChecklistArea, CampoChecklistDefinition> = {
  DRENAGEM: {
    area: "DRENAGEM",
    title: "Checklist de drenagem",
    description: "Avaliação de obstrução, fluxo e integridade da rede e dos dispositivos.",
    issueLabel: "Não conformidade de drenagem",
    items: [
      { id: "obstrucao", label: "Obstrução" },
      { id: "assoreamento", label: "Assoreamento" },
      { id: "colapso", label: "Colapso estrutural" },
      { id: "tampa-ausente", label: "Tampa ausente" },
      { id: "retorno-agua", label: "Retorno de água" },
    ],
  },
  PAVIMENTACAO: {
    area: "PAVIMENTACAO",
    title: "Checklist de pavimentação",
    description: "Avaliação de patologias, reparos e da drenagem associada ao trecho.",
    issueLabel: "Não conformidade de pavimentação",
    items: [
      { id: "trinca", label: "Trinca" },
      { id: "buraco", label: "Buraco" },
      { id: "afundamento", label: "Afundamento" },
      { id: "remendo-ruim", label: "Remendo ruim" },
      { id: "drenagem-associada", label: "Drenagem associada" },
    ],
  },
  ILUMINACAO: {
    area: "ILUMINACAO",
    title: "Checklist de iluminação pública",
    description: "Avaliação de funcionamento, integridade e segurança da base elétrica.",
    issueLabel: "Não conformidade de iluminação",
    items: [
      { id: "ponto-apagado", label: "Ponto apagado" },
      { id: "oscilacao", label: "Oscilação" },
      { id: "luminaria-quebrada", label: "Luminária quebrada" },
      { id: "poste-danificado", label: "Poste danificado" },
    ],
  },
  ARBORIZACAO: {
    area: "ARBORIZACAO",
    title: "Checklist de arborização",
    description: "Avaliação fitossanitária, risco e interferências com a infraestrutura urbana.",
    issueLabel: "Não conformidade de arborização",
    items: [
      { id: "risco-queda", label: "Risco de queda" },
      { id: "praga", label: "Praga" },
      { id: "poda-necessaria", label: "Poda necessária" },
      { id: "conflito-rede", label: "Conflito com rede" },
    ],
  },
};

export function isCampoChecklistSupportedArea(
  area: ProjectDisciplineId | null | undefined
): area is SupportedChecklistArea {
  return (
    typeof area === "string" &&
    Object.prototype.hasOwnProperty.call(CAMPO_CHECKLIST_DEFINITIONS, area)
  );
}

export function getCampoChecklistDefinition(area: ProjectDisciplineId | null | undefined) {
  return isCampoChecklistSupportedArea(area) ? CAMPO_CHECKLIST_DEFINITIONS[area] : null;
}

export function getCampoChecklistStatusLabel(status: CampoChecklistStatus) {
  switch (status) {
    case "CONFORME":
      return "Conforme";
    case "NAO_CONFORME":
      return "Não conforme";
    case "NAO_SE_APLICA":
      return "Não se aplica";
  }
}

export function normalizeCampoChecklistEntries(
  area: ProjectDisciplineId | null | undefined,
  entries: CampoChecklistEntry[] | null | undefined
) {
  const definition = getCampoChecklistDefinition(area);
  if (!definition) return [] as CampoChecklistEntry[];

  const validIds = new Set(definition.items.map((item) => item.id));

  return (entries ?? []).filter(
    (entry): entry is CampoChecklistEntry =>
      Boolean(
        entry &&
          typeof entry.itemId === "string" &&
          validIds.has(entry.itemId) &&
          typeof entry.status === "string" &&
          (CAMPO_CHECKLIST_STATUS_VALUES as readonly string[]).includes(entry.status)
      )
  );
}

export function validateCampoChecklistEntries(
  area: ProjectDisciplineId | null | undefined,
  entries: CampoChecklistEntry[] | null | undefined
) {
  const definition = getCampoChecklistDefinition(area);
  if (!definition) {
    return { ok: true as const, entries: [] as CampoChecklistEntry[], error: null };
  }

  const normalized = normalizeCampoChecklistEntries(area, entries);
  if (normalized.length !== definition.items.length) {
    return {
      ok: false as const,
      entries: normalized,
      error: `Preencha todo o ${definition.title.toLowerCase()} antes de salvar a vistoria.`,
    };
  }

  return { ok: true as const, entries: normalized, error: null };
}

export function summarizeCampoChecklist(
  area: ProjectDisciplineId | null | undefined,
  entries: CampoChecklistEntry[] | null | undefined
): CampoChecklistSummary {
  const definition = getCampoChecklistDefinition(area);
  if (!definition) {
    return {
      answeredCount: 0,
      conformingCount: 0,
      nonConformingCount: 0,
      notApplicableCount: 0,
      nonConformityLabels: [],
    };
  }

  const entriesById = new Map(
    normalizeCampoChecklistEntries(area, entries).map((entry) => [entry.itemId, entry.status])
  );
  const nonConformityLabels: string[] = [];
  let conformingCount = 0;
  let nonConformingCount = 0;
  let notApplicableCount = 0;

  for (const item of definition.items) {
    const status = entriesById.get(item.id);
    if (!status) continue;
    if (status === "CONFORME") conformingCount += 1;
    if (status === "NAO_CONFORME") {
      nonConformingCount += 1;
      nonConformityLabels.push(item.label);
    }
    if (status === "NAO_SE_APLICA") notApplicableCount += 1;
  }

  return {
    answeredCount: conformingCount + nonConformingCount + notApplicableCount,
    conformingCount,
    nonConformingCount,
    notApplicableCount,
    nonConformityLabels,
  };
}

export function buildCampoChecklistDefaultIssueTitle(input: {
  area: ProjectDisciplineId | null | undefined;
  checklistEntries: CampoChecklistEntry[] | null | undefined;
  fallbackName: string;
}) {
  const definition = getCampoChecklistDefinition(input.area);
  const summary = summarizeCampoChecklist(input.area, input.checklistEntries);

  if (!definition || summary.nonConformityLabels.length === 0) {
    return input.fallbackName;
  }

  const [first, ...rest] = summary.nonConformityLabels;
  return rest.length > 0
    ? `${definition.issueLabel}: ${first} e mais ${rest.length}`
    : `${definition.issueLabel}: ${first}`;
}

export function buildCampoChecklistIssueDescription(input: {
  area: ProjectDisciplineId | null | undefined;
  checklistEntries: CampoChecklistEntry[] | null | undefined;
  note: string | null | undefined;
}) {
  const definition = getCampoChecklistDefinition(input.area);
  const summary = summarizeCampoChecklist(input.area, input.checklistEntries);
  const parts: string[] = [];

  if (definition) {
    parts.push(`${definition.title} - ${getProjectDisciplineLabel(definition.area)}.`);
  }

  if (summary.nonConformityLabels.length > 0) {
    parts.push(`Não conformidades: ${summary.nonConformityLabels.join(", ")}.`);
  }

  if (input.note && input.note.trim().length > 0) {
    parts.push(`Observações: ${input.note.trim()}`);
  }

  return parts.join(" ");
}

export function deriveCampoChecklistIssuePriority(
  entries: CampoChecklistEntry[] | null | undefined
): ProjectPriorityValue {
  const nonConformities = (entries ?? []).filter(
    (entry) => entry.status === "NAO_CONFORME"
  ).length;
  if (nonConformities >= 3) return "URGENTE";
  if (nonConformities >= 2) return "ALTA";
  if (nonConformities >= 1) return "MEDIA";
  return PROJECT_PRIORITY_VALUES[1];
}
