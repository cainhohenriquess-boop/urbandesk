export const PROJECT_STATUS_VALUES = [
  "PLANEJADO",
  "EM_ANDAMENTO",
  "PARALISADO",
  "CONCLUIDO",
  "CANCELADO",
] as const;

export const PROJECT_TYPE_VALUES = [
  "OBRA",
  "SERVICO_ENGENHARIA",
  "MANUTENCAO",
  "ESTUDO_PROJETO",
  "FISCALIZACAO",
  "LICITACAO",
  "PLANO_SETORIAL",
  "REGULARIZACAO",
] as const;

export const PROJECT_PRIORITY_VALUES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;

export const PROJECT_DEADLINE_FILTER_VALUES = [
  "DELAYED",
  "DUE_SOON",
  "ON_TRACK",
  "NO_DEADLINE",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];
export type ProjectTypeValue = (typeof PROJECT_TYPE_VALUES)[number];
export type ProjectPriorityValue = (typeof PROJECT_PRIORITY_VALUES)[number];
export type ProjectDeadlineFilterValue =
  (typeof PROJECT_DEADLINE_FILTER_VALUES)[number];

export const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectStatusValue;
  label: string;
}> = [
  { value: "PLANEJADO", label: "Planejado" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "PARALISADO", label: "Paralisado" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
];

export const PROJECT_TYPE_OPTIONS: Array<{
  value: ProjectTypeValue;
  label: string;
}> = [
  { value: "OBRA", label: "Obra" },
  { value: "SERVICO_ENGENHARIA", label: "Serviço de engenharia" },
  { value: "MANUTENCAO", label: "Manutenção" },
  { value: "ESTUDO_PROJETO", label: "Estudo e projeto" },
  { value: "FISCALIZACAO", label: "Fiscalização" },
  { value: "LICITACAO", label: "Licitação" },
  { value: "PLANO_SETORIAL", label: "Plano setorial" },
  { value: "REGULARIZACAO", label: "Regularização" },
];

export const PROJECT_PRIORITY_OPTIONS: Array<{
  value: ProjectPriorityValue;
  label: string;
}> = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Média" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

export const PROJECT_DEADLINE_FILTER_OPTIONS: Array<{
  value: ProjectDeadlineFilterValue;
  label: string;
}> = [
  { value: "DELAYED", label: "Atrasados" },
  { value: "DUE_SOON", label: "Vence em até 30 dias" },
  { value: "ON_TRACK", label: "Dentro do prazo" },
  { value: "NO_DEADLINE", label: "Sem prazo definido" },
];

export function getProjectStatusLabel(status: ProjectStatusValue): string {
  return (
    PROJECT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

export function getProjectStatusTone(status: ProjectStatusValue): string {
  switch (status) {
    case "EM_ANDAMENTO":
      return "bg-brand-50 text-brand-700 ring-brand-200";
    case "CONCLUIDO":
      return "bg-accent-50 text-accent-700 ring-accent-200";
    case "PARALISADO":
      return "bg-warning-50 text-warning-700 ring-warning-200";
    case "CANCELADO":
      return "bg-danger-50 text-danger-700 ring-danger-200";
    case "PLANEJADO":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function getProjectTypeLabel(
  projectType: ProjectTypeValue | null | undefined
): string {
  if (!projectType) return "Não informado";
  return (
    PROJECT_TYPE_OPTIONS.find((item) => item.value === projectType)?.label ??
    projectType
  );
}

export function getProjectPriorityLabel(
  priority: ProjectPriorityValue | null | undefined
): string {
  if (!priority) return "Não definida";
  return (
    PROJECT_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ??
    priority
  );
}

export function getProjectPriorityTone(
  priority: ProjectPriorityValue | null | undefined
): string {
  switch (priority) {
    case "URGENTE":
      return "bg-danger-50 text-danger-700 ring-danger-200";
    case "ALTA":
      return "bg-warning-50 text-warning-700 ring-warning-200";
    case "MEDIA":
      return "bg-brand-50 text-brand-700 ring-brand-200";
    case "BAIXA":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}
