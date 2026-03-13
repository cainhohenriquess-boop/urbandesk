import type {
  ProjectContractStatus,
  ProjectDocumentType,
  ProjectInspectionStatus,
  ProjectInspectionType,
  ProjectIssueStatus,
  ProjectIssueType,
  ProjectMeasurementStatus,
  ProjectOperationalStatus,
  ProjectRiskCategory,
  ProjectRiskImpact,
  ProjectRiskProbability,
  ProjectRiskStatus,
  ProjectTechnicalArea,
} from "@prisma/client";

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

const PROJECT_OPERATIONAL_STATUS_LABELS: Record<ProjectOperationalStatus, string> = {
  CADASTRADO: "Cadastrado",
  EM_ESTUDO: "Em estudo",
  EM_LICITACAO: "Em licitação",
  CONTRATADO: "Contratado",
  EM_EXECUCAO: "Em execução",
  EM_MEDICAO: "Em medição",
  PARALISADO: "Paralisado",
  EM_RECEBIMENTO: "Em recebimento",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
};

const PROJECT_TECHNICAL_AREA_LABELS: Record<ProjectTechnicalArea, string> = {
  DRENAGEM: "Drenagem",
  PAVIMENTACAO: "Pavimentação",
  ILUMINACAO: "Iluminação",
  ARBORIZACAO: "Arborização",
  SINALIZACAO: "Sinalização",
  FISCALIZACAO: "Fiscalização",
  MOBILIDADE: "Mobilidade",
  SANEAMENTO: "Saneamento",
  EDIFICACOES: "Edificações",
  ZELADORIA: "Zeladoria",
};

const PROJECT_CONTRACT_STATUS_LABELS: Record<ProjectContractStatus, string> = {
  MINUTA: "Minuta",
  VIGENTE: "Vigente",
  ADITIVADO: "Aditivado",
  SUSPENSO: "Suspenso",
  ENCERRADO: "Encerrado",
  RESCINDIDO: "Rescindido",
};

const PROJECT_DOCUMENT_TYPE_LABELS: Record<ProjectDocumentType, string> = {
  TERMO_REFERENCIA: "Termo de referência",
  PROJETO_BASICO: "Projeto básico",
  PROJETO_EXECUTIVO: "Projeto executivo",
  MEMORIAL: "Memorial",
  ORCAMENTO: "Orçamento",
  CRONOGRAMA: "Cronograma",
  LICITACAO: "Licitação",
  CONTRATO: "Contrato",
  ADITIVO: "Aditivo",
  MEDICAO: "Medição",
  RELATORIO: "Relatório",
  LICENCA: "Licença",
  MAPA: "Mapa",
  FOTO: "Foto",
  OUTRO: "Outro",
};

const PROJECT_MEASUREMENT_STATUS_LABELS: Record<ProjectMeasurementStatus, string> = {
  RASCUNHO: "Rascunho",
  SUBMETIDA: "Submetida",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
  PAGA: "Paga",
};

const PROJECT_INSPECTION_TYPE_LABELS: Record<ProjectInspectionType, string> = {
  ROTINA: "Rotina",
  MEDICAO: "Medição",
  QUALIDADE: "Qualidade",
  SEGURANCA: "Segurança",
  RECEBIMENTO: "Recebimento",
  EXTRAORDINARIA: "Extraordinária",
};

const PROJECT_INSPECTION_STATUS_LABELS: Record<ProjectInspectionStatus, string> = {
  AGENDADA: "Agendada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

const PROJECT_ISSUE_TYPE_LABELS: Record<ProjectIssueType, string> = {
  BLOQUEIO: "Bloqueio",
  NAO_CONFORMIDADE: "Não conformidade",
  SEGURANCA: "Segurança",
  AMBIENTAL: "Ambiental",
  PRAZO: "Prazo",
  FINANCEIRO: "Financeiro",
  DOCUMENTAL: "Documental",
  COMUNITARIO: "Comunitário",
  TECNICO: "Técnico",
  OUTRO: "Outro",
};

const PROJECT_ISSUE_STATUS_LABELS: Record<ProjectIssueStatus, string> = {
  ABERTA: "Aberta",
  EM_TRATATIVA: "Em tratativa",
  RESOLVIDA: "Resolvida",
  FECHADA: "Fechada",
  CANCELADA: "Cancelada",
};

const PROJECT_RISK_CATEGORY_LABELS: Record<ProjectRiskCategory, string> = {
  PRAZO: "Prazo",
  FINANCEIRO: "Financeiro",
  TECNICO: "Técnico",
  AMBIENTAL: "Ambiental",
  JURIDICO: "Jurídico",
  OPERACIONAL: "Operacional",
  SOCIAL: "Social",
  SEGURANCA: "Segurança",
  CLIMATICO: "Climático",
  OUTRO: "Outro",
};

const PROJECT_RISK_STATUS_LABELS: Record<ProjectRiskStatus, string> = {
  IDENTIFICADO: "Identificado",
  MONITORANDO: "Monitorando",
  MITIGADO: "Mitigado",
  MATERIALIZADO: "Materializado",
  ENCERRADO: "Encerrado",
};

const PROJECT_RISK_PROBABILITY_LABELS: Record<ProjectRiskProbability, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

const PROJECT_RISK_IMPACT_LABELS: Record<ProjectRiskImpact, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
  CRITICO: "Crítico",
};

export function getProjectOperationalStatusLabel(
  value: ProjectOperationalStatus | null | undefined
) {
  return value ? PROJECT_OPERATIONAL_STATUS_LABELS[value] ?? titleCase(value) : "Não informado";
}

export function getProjectTechnicalAreaLabel(value: ProjectTechnicalArea) {
  return PROJECT_TECHNICAL_AREA_LABELS[value] ?? titleCase(value);
}

export function getProjectContractStatusLabel(value: ProjectContractStatus) {
  return PROJECT_CONTRACT_STATUS_LABELS[value] ?? titleCase(value);
}

export function getProjectDocumentTypeLabel(value: ProjectDocumentType) {
  return PROJECT_DOCUMENT_TYPE_LABELS[value] ?? titleCase(value);
}

export function getProjectMeasurementStatusLabel(value: ProjectMeasurementStatus) {
  return PROJECT_MEASUREMENT_STATUS_LABELS[value] ?? titleCase(value);
}

export function getProjectInspectionTypeLabel(value: ProjectInspectionType) {
  return PROJECT_INSPECTION_TYPE_LABELS[value] ?? titleCase(value);
}

export function getProjectInspectionStatusLabel(value: ProjectInspectionStatus) {
  return PROJECT_INSPECTION_STATUS_LABELS[value] ?? titleCase(value);
}

export function getProjectIssueTypeLabel(value: ProjectIssueType) {
  return PROJECT_ISSUE_TYPE_LABELS[value] ?? titleCase(value);
}

export function getProjectIssueStatusLabel(value: ProjectIssueStatus) {
  return PROJECT_ISSUE_STATUS_LABELS[value] ?? titleCase(value);
}

export function getProjectRiskCategoryLabel(value: ProjectRiskCategory) {
  return PROJECT_RISK_CATEGORY_LABELS[value] ?? titleCase(value);
}

export function getProjectRiskStatusLabel(value: ProjectRiskStatus) {
  return PROJECT_RISK_STATUS_LABELS[value] ?? titleCase(value);
}

export function getProjectRiskProbabilityLabel(value: ProjectRiskProbability) {
  return PROJECT_RISK_PROBABILITY_LABELS[value] ?? titleCase(value);
}

export function getProjectRiskImpactLabel(value: ProjectRiskImpact) {
  return PROJECT_RISK_IMPACT_LABELS[value] ?? titleCase(value);
}

export function getGovernanceTone(status: string | null | undefined) {
  switch (status) {
    case "CONCLUIDO":
    case "CONCLUIDA":
    case "APROVADA":
    case "PAGA":
    case "VIGENTE":
    case "REALIZADA":
    case "RESOLVIDA":
    case "FECHADA":
    case "MITIGADO":
    case "ENCERRADO":
      return "success" as const;
    case "PARALISADO":
    case "SUSPENSO":
    case "EM_TRATATIVA":
    case "SUBMETIDA":
    case "EM_RISCO":
    case "ATRASADO":
    case "BLOQUEADA":
    case "BLOQUEADO":
    case "AGENDADA":
    case "IDENTIFICADO":
    case "MONITORANDO":
      return "warning" as const;
    case "CANCELADO":
    case "CANCELADA":
    case "REJEITADA":
    case "RESCINDIDO":
    case "MATERIALIZADO":
    case "ABERTA":
      return "danger" as const;
    case "EM_ANDAMENTO":
    case "EM_EXECUCAO":
    case "CONTRATADO":
    case "EM_MEDICAO":
      return "brand" as const;
    default:
      return "neutral" as const;
  }
}
