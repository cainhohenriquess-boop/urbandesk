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

function normalizeProjectLabelText(value: string) {
  if (!/[ÃÂâ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
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
  EDITAL: "Edital",
  ORDEM_SERVICO: "Ordem de serviço",
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
  RELATORIO_FOTOGRAFICO: "Relatório fotográfico",
  LAUDO: "Laudo",
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
  MEDICAO: "MediÃ§Ã£o",
  QUALIDADE: "Qualidade",
  SEGURANCA: "SeguranÃ§a",
  RECEBIMENTO: "Recebimento",
  EXTRAORDINARIA: "ExtraordinÃ¡ria",
};

const PROJECT_INSPECTION_STATUS_LABELS: Record<ProjectInspectionStatus, string> = {
  AGENDADA: "Agendada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

const PROJECT_ISSUE_TYPE_LABELS: Record<ProjectIssueType, string> = {
  BLOQUEIO: "Bloqueio",
  NAO_CONFORMIDADE: "NÃ£o conformidade",
  SEGURANCA: "SeguranÃ§a",
  AMBIENTAL: "Ambiental",
  PRAZO: "Prazo",
  FINANCEIRO: "Financeiro",
  DOCUMENTAL: "Documental",
  COMUNITARIO: "ComunitÃ¡rio",
  TECNICO: "TÃ©cnico",
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
  TECNICO: "TÃ©cnico",
  AMBIENTAL: "Ambiental",
  JURIDICO: "JurÃ­dico",
  OPERACIONAL: "Operacional",
  SOCIAL: "Social",
  SEGURANCA: "SeguranÃ§a",
  CLIMATICO: "ClimÃ¡tico",
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
  MEDIA: "MÃ©dia",
  ALTA: "Alta",
};

const PROJECT_RISK_IMPACT_LABELS: Record<ProjectRiskImpact, string> = {
  BAIXO: "Baixo",
  MEDIO: "MÃ©dio",
  ALTO: "Alto",
  CRITICO: "CrÃ­tico",
};

export function getProjectOperationalStatusLabel(
  value: ProjectOperationalStatus | null | undefined
) {
  return value
    ? normalizeProjectLabelText(PROJECT_OPERATIONAL_STATUS_LABELS[value] ?? titleCase(value))
    : "Não informado";
}

export function getProjectTechnicalAreaLabel(value: ProjectTechnicalArea) {
  return normalizeProjectLabelText(PROJECT_TECHNICAL_AREA_LABELS[value] ?? titleCase(value));
}

export function getProjectContractStatusLabel(value: ProjectContractStatus) {
  return normalizeProjectLabelText(PROJECT_CONTRACT_STATUS_LABELS[value] ?? titleCase(value));
}

export function getProjectDocumentTypeLabel(value: ProjectDocumentType) {
  return normalizeProjectLabelText(PROJECT_DOCUMENT_TYPE_LABELS[value] ?? titleCase(value));
}

export function getProjectMeasurementStatusLabel(value: ProjectMeasurementStatus) {
  return normalizeProjectLabelText(
    PROJECT_MEASUREMENT_STATUS_LABELS[value] ?? titleCase(value)
  );
}

export function getProjectInspectionTypeLabel(value: ProjectInspectionType) {
  return normalizeProjectLabelText(PROJECT_INSPECTION_TYPE_LABELS[value] ?? titleCase(value));
}

export function getProjectInspectionStatusLabel(value: ProjectInspectionStatus) {
  return normalizeProjectLabelText(
    PROJECT_INSPECTION_STATUS_LABELS[value] ?? titleCase(value)
  );
}

export function getProjectIssueTypeLabel(value: ProjectIssueType) {
  return normalizeProjectLabelText(PROJECT_ISSUE_TYPE_LABELS[value] ?? titleCase(value));
}

export function getProjectIssueStatusLabel(value: ProjectIssueStatus) {
  return normalizeProjectLabelText(PROJECT_ISSUE_STATUS_LABELS[value] ?? titleCase(value));
}

export function getProjectRiskCategoryLabel(value: ProjectRiskCategory) {
  return normalizeProjectLabelText(PROJECT_RISK_CATEGORY_LABELS[value] ?? titleCase(value));
}

export function getProjectRiskStatusLabel(value: ProjectRiskStatus) {
  return normalizeProjectLabelText(PROJECT_RISK_STATUS_LABELS[value] ?? titleCase(value));
}

export function getProjectRiskProbabilityLabel(value: ProjectRiskProbability) {
  return normalizeProjectLabelText(
    PROJECT_RISK_PROBABILITY_LABELS[value] ?? titleCase(value)
  );
}

export function getProjectRiskImpactLabel(value: ProjectRiskImpact) {
  return normalizeProjectLabelText(PROJECT_RISK_IMPACT_LABELS[value] ?? titleCase(value));
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

