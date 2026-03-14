import type { ProjectTechnicalArea } from "@prisma/client";

export const PRISMA_PROJECT_TECHNICAL_AREAS = [
  "DRENAGEM",
  "PAVIMENTACAO",
  "ILUMINACAO",
  "ARBORIZACAO",
  "SINALIZACAO",
  "FISCALIZACAO",
  "MOBILIDADE",
  "SANEAMENTO",
  "EDIFICACOES",
  "ZELADORIA",
] as const satisfies readonly ProjectTechnicalArea[];

export const PROJECT_DISCIPLINE_IDS = [
  ...PRISMA_PROJECT_TECHNICAL_AREAS,
  "OBRAS",
] as const;

export type ProjectDisciplineId = (typeof PROJECT_DISCIPLINE_IDS)[number];

export const TECHNICAL_OBJECT_TYPE_IDS = [
  "BOCA_LOBO",
  "POCO_VISITA",
  "HIDRANTE",
  "GALERIA_PLUVIAL",
  "SEMAFORO",
  "PLACA_TRANSITO",
  "LOMBADA",
  "PONTO_ONIBUS",
  "RADAR",
  "PINTURA_VIARIA",
  "POSTE_LUZ",
  "LUMINARIA",
  "ARVORE",
  "CANTEIRO_ARBORIZACAO",
  "LIXEIRA",
  "BURACO",
  "TRECHO_PAVIMENTO",
  "PONTO_FISCALIZACAO",
  "AREA_FISCALIZADA",
  "EQUIPAMENTO_OBRA",
  "FRENTE_OBRA",
  "EDIFICACAO_PUBLICA",
] as const;

export type TechnicalObjectTypeId = (typeof TECHNICAL_OBJECT_TYPE_IDS)[number];
export type TechnicalGeometryKind = "point" | "line" | "polygon";
export type TechnicalFieldKind = "text" | "textarea" | "number" | "select" | "date";

export type TechnicalFieldOption = {
  value: string;
  label: string;
};

export type TechnicalFieldDefinition = {
  key: string;
  label: string;
  kind: TechnicalFieldKind;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  min?: number;
  max?: number;
  options?: TechnicalFieldOption[];
};

export type TechnicalObjectDefinition = {
  id: TechnicalObjectTypeId;
  area: ProjectDisciplineId;
  label: string;
  helper: string;
  geometry: TechnicalGeometryKind;
  fields?: TechnicalFieldDefinition[];
};

export type ProjectDisciplineDefinition = {
  id: ProjectDisciplineId;
  label: string;
  description: string;
  accentClassName: string;
  commonFields?: TechnicalFieldDefinition[];
  objectTypes: TechnicalObjectTypeId[];
};

const DISCIPLINE_LABELS: Record<ProjectDisciplineId, string> = {
  DRENAGEM: "Drenagem",
  PAVIMENTACAO: "Pavimentação",
  ILUMINACAO: "Iluminação pública",
  ARBORIZACAO: "Arborização",
  SINALIZACAO: "Sinalização",
  FISCALIZACAO: "Fiscalização",
  MOBILIDADE: "Mobilidade",
  SANEAMENTO: "Saneamento",
  EDIFICACOES: "Edificações",
  ZELADORIA: "Zeladoria",
  OBRAS: "Obras",
};

const TECHNICAL_OBJECT_DEFINITIONS: Record<TechnicalObjectTypeId, TechnicalObjectDefinition> = {
  BOCA_LOBO: {
    id: "BOCA_LOBO",
    area: "DRENAGEM",
    label: "Boca de lobo",
    helper: "Captação superficial",
    geometry: "point",
    fields: [
      {
        key: "gratingState",
        label: "Estado da grelha",
        kind: "select",
        options: [
          { value: "INTEGRA", label: "Íntegra" },
          { value: "DANIFICADA", label: "Danificada" },
          { value: "AUSENTE", label: "Ausente" },
        ],
      },
    ],
  },
  POCO_VISITA: {
    id: "POCO_VISITA",
    area: "DRENAGEM",
    label: "Poço de visita",
    helper: "Acesso à rede subterrânea",
    geometry: "point",
    fields: [
      {
        key: "depthMeters",
        label: "Profundidade (m)",
        kind: "number",
        min: 0,
        max: 100,
      },
    ],
  },
  HIDRANTE: {
    id: "HIDRANTE",
    area: "SANEAMENTO",
    label: "Hidrante",
    helper: "Combate a incêndio",
    geometry: "point",
  },
  GALERIA_PLUVIAL: {
    id: "GALERIA_PLUVIAL",
    area: "DRENAGEM",
    label: "Galeria pluvial",
    helper: "Rede linear de drenagem",
    geometry: "line",
    fields: [
      {
        key: "diameterMm",
        label: "Diâmetro (mm)",
        kind: "number",
        min: 100,
        max: 5000,
      },
    ],
  },
  SEMAFORO: {
    id: "SEMAFORO",
    area: "SINALIZACAO",
    label: "Semáforo",
    helper: "Controle semafórico",
    geometry: "point",
    fields: [
      {
        key: "signalMode",
        label: "Modo",
        kind: "select",
        options: [
          { value: "VEICULAR", label: "Veicular" },
          { value: "PEDESTRE", label: "Pedestre" },
          { value: "MISTO", label: "Misto" },
        ],
      },
    ],
  },
  PLACA_TRANSITO: {
    id: "PLACA_TRANSITO",
    area: "SINALIZACAO",
    label: "Placa de trânsito",
    helper: "Sinalização vertical",
    geometry: "point",
    fields: [
      {
        key: "plateCategory",
        label: "Categoria",
        kind: "select",
        options: [
          { value: "REGULAMENTACAO", label: "Regulamentação" },
          { value: "ADVERTENCIA", label: "Advertência" },
          { value: "INDICACAO", label: "Indicação" },
        ],
      },
    ],
  },
  LOMBADA: {
    id: "LOMBADA",
    area: "SINALIZACAO",
    label: "Lombada",
    helper: "Moderação de tráfego",
    geometry: "point",
  },
  PONTO_ONIBUS: {
    id: "PONTO_ONIBUS",
    area: "MOBILIDADE",
    label: "Ponto de ônibus",
    helper: "Equipamento de mobilidade",
    geometry: "point",
  },
  RADAR: {
    id: "RADAR",
    area: "MOBILIDADE",
    label: "Radar",
    helper: "Fiscalização eletrônica",
    geometry: "point",
  },
  PINTURA_VIARIA: {
    id: "PINTURA_VIARIA",
    area: "SINALIZACAO",
    label: "Pintura viária",
    helper: "Faixas e marcas horizontais",
    geometry: "line",
    fields: [
      {
        key: "paintCondition",
        label: "Estado da pintura",
        kind: "select",
        options: [
          { value: "NOVA", label: "Nova" },
          { value: "BOA", label: "Boa" },
          { value: "DESGASTADA", label: "Desgastada" },
        ],
      },
    ],
  },
  POSTE_LUZ: {
    id: "POSTE_LUZ",
    area: "ILUMINACAO",
    label: "Poste de luz",
    helper: "Infraestrutura de iluminação",
    geometry: "point",
    fields: [
      {
        key: "luminaireType",
        label: "Tipo de luminária",
        kind: "select",
        options: [
          { value: "LED", label: "LED" },
          { value: "VAPOR_SODIO", label: "Vapor de sódio" },
          { value: "VAPOR_METALICO", label: "Vapor metálico" },
        ],
      },
    ],
  },
  LUMINARIA: {
    id: "LUMINARIA",
    area: "ILUMINACAO",
    label: "Luminária",
    helper: "Ponto de iluminação",
    geometry: "point",
    fields: [
      {
        key: "powerWatts",
        label: "Potência (W)",
        kind: "number",
        min: 1,
        max: 2000,
      },
    ],
  },
  ARVORE: {
    id: "ARVORE",
    area: "ARBORIZACAO",
    label: "Árvore",
    helper: "Elemento arbóreo",
    geometry: "point",
    fields: [
      {
        key: "treeCondition",
        label: "Condição",
        kind: "select",
        options: [
          { value: "SAUDAVEL", label: "Saudável" },
          { value: "PRECISA_PODA", label: "Precisa de poda" },
          { value: "EM_RISCO", label: "Em risco" },
        ],
      },
    ],
  },
  CANTEIRO_ARBORIZACAO: {
    id: "CANTEIRO_ARBORIZACAO",
    area: "ARBORIZACAO",
    label: "Canteiro de arborização",
    helper: "Área de plantio ou recomposição",
    geometry: "polygon",
  },
  LIXEIRA: {
    id: "LIXEIRA",
    area: "ZELADORIA",
    label: "Lixeira",
    helper: "Equipamento urbano",
    geometry: "point",
  },
  BURACO: {
    id: "BURACO",
    area: "PAVIMENTACAO",
    label: "Buraco",
    helper: "Patologia do pavimento",
    geometry: "point",
  },
  TRECHO_PAVIMENTO: {
    id: "TRECHO_PAVIMENTO",
    area: "PAVIMENTACAO",
    label: "Trecho de pavimentação",
    helper: "Segmento linear de intervenção",
    geometry: "line",
    fields: [
      {
        key: "widthMeters",
        label: "Largura média (m)",
        kind: "number",
        min: 0,
        max: 100,
      },
    ],
  },
  PONTO_FISCALIZACAO: {
    id: "PONTO_FISCALIZACAO",
    area: "FISCALIZACAO",
    label: "Ponto de fiscalização",
    helper: "Registro pontual de inspeção",
    geometry: "point",
    fields: [
      {
        key: "occurrenceType",
        label: "Ocorrência",
        kind: "select",
        options: [
          { value: "ROTINA", label: "Rotina" },
          { value: "MEDICAO", label: "Medição" },
          { value: "NOTIFICACAO", label: "Notificação" },
        ],
      },
    ],
  },
  AREA_FISCALIZADA: {
    id: "AREA_FISCALIZADA",
    area: "FISCALIZACAO",
    label: "Área fiscalizada",
    helper: "Polígono de interdição ou vistoria",
    geometry: "polygon",
  },
  EQUIPAMENTO_OBRA: {
    id: "EQUIPAMENTO_OBRA",
    area: "OBRAS",
    label: "Equipamento de obra",
    helper: "Canteiro, máquina ou apoio",
    geometry: "point",
    fields: [
      {
        key: "equipmentType",
        label: "Tipo de equipamento",
        kind: "text",
        placeholder: "Escavadeira, betoneira, gerador...",
      },
    ],
  },
  FRENTE_OBRA: {
    id: "FRENTE_OBRA",
    area: "OBRAS",
    label: "Frente de obra",
    helper: "Área principal de execução",
    geometry: "polygon",
    fields: [
      {
        key: "workStage",
        label: "Etapa da frente",
        kind: "select",
        options: [
          { value: "MOBILIZACAO", label: "Mobilização" },
          { value: "EXECUCAO", label: "Execução" },
          { value: "ACABAMENTO", label: "Acabamento" },
          { value: "ENTREGA", label: "Entrega" },
        ],
      },
    ],
  },
  EDIFICACAO_PUBLICA: {
    id: "EDIFICACAO_PUBLICA",
    area: "EDIFICACOES",
    label: "Edificação pública",
    helper: "Equipamento edificado",
    geometry: "polygon",
  },
};

export const PROJECT_DISCIPLINE_DEFINITIONS: Record<
  ProjectDisciplineId,
  ProjectDisciplineDefinition
> = {
  DRENAGEM: {
    id: "DRENAGEM",
    label: DISCIPLINE_LABELS.DRENAGEM,
    description: "Rede pluvial, dispositivos de captação e intervenções lineares.",
    accentClassName: "border-sky-200 bg-sky-50 text-sky-700",
    commonFields: [
      {
        key: "networkMaterial",
        label: "Material da rede",
        kind: "select",
        options: [
          { value: "CONCRETO", label: "Concreto" },
          { value: "PVC", label: "PVC" },
          { value: "PEAD", label: "PEAD" },
          { value: "FERRO", label: "Ferro fundido" },
        ],
      },
      {
        key: "hydraulicCondition",
        label: "Situação hidráulica",
        kind: "select",
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "ASSOREADA", label: "Assoreada" },
          { value: "OBSTRUIDA", label: "Obstruída" },
          { value: "MANUTENCAO", label: "Em manutenção" },
        ],
      },
    ],
    objectTypes: ["BOCA_LOBO", "POCO_VISITA", "GALERIA_PLUVIAL"],
  },
  PAVIMENTACAO: {
    id: "PAVIMENTACAO",
    label: DISCIPLINE_LABELS.PAVIMENTACAO,
    description: "Trechos viários, patologias e frentes de recuperação.",
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
    commonFields: [
      {
        key: "pavementType",
        label: "Revestimento",
        kind: "select",
        options: [
          { value: "ASFALTO", label: "Asfalto" },
          { value: "INTERTRAVADO", label: "Intertravado" },
          { value: "CONCRETO", label: "Concreto" },
          { value: "PARALELEPIPEDO", label: "Paralelepípedo" },
        ],
      },
      {
        key: "interventionPriority",
        label: "Prioridade",
        kind: "select",
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "Média" },
          { value: "ALTA", label: "Alta" },
        ],
      },
    ],
    objectTypes: ["TRECHO_PAVIMENTO", "BURACO"],
  },
  ILUMINACAO: {
    id: "ILUMINACAO",
    label: DISCIPLINE_LABELS.ILUMINACAO,
    description: "Pontos, luminárias e circuitos de iluminação pública.",
    accentClassName: "border-yellow-200 bg-yellow-50 text-yellow-700",
    commonFields: [
      {
        key: "powerCircuit",
        label: "Circuito",
        kind: "text",
        placeholder: "Ex.: CIR-12",
      },
    ],
    objectTypes: ["POSTE_LUZ", "LUMINARIA"],
  },
  ARBORIZACAO: {
    id: "ARBORIZACAO",
    label: DISCIPLINE_LABELS.ARBORIZACAO,
    description: "Árvores, canteiros e manejo urbano.",
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    commonFields: [
      {
        key: "species",
        label: "Espécie",
        kind: "text",
        placeholder: "Ex.: oiti, ipê, nim...",
      },
      {
        key: "canopySize",
        label: "Porte",
        kind: "select",
        options: [
          { value: "PEQUENO", label: "Pequeno" },
          { value: "MEDIO", label: "Médio" },
          { value: "GRANDE", label: "Grande" },
        ],
      },
    ],
    objectTypes: ["ARVORE", "CANTEIRO_ARBORIZACAO"],
  },
  SINALIZACAO: {
    id: "SINALIZACAO",
    label: DISCIPLINE_LABELS.SINALIZACAO,
    description: "Sinalização vertical, horizontal e semafórica.",
    accentClassName: "border-rose-200 bg-rose-50 text-rose-700",
    commonFields: [
      {
        key: "signCode",
        label: "Código técnico",
        kind: "text",
        placeholder: "Ex.: R-1, A-2b, FAIXA-01...",
      },
      {
        key: "operationCondition",
        label: "Condição operacional",
        kind: "select",
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "DESGASTADA", label: "Desgastada" },
          { value: "INOPERANTE", label: "Inoperante" },
        ],
      },
    ],
    objectTypes: ["SEMAFORO", "PLACA_TRANSITO", "LOMBADA", "PINTURA_VIARIA"],
  },
  FISCALIZACAO: {
    id: "FISCALIZACAO",
    label: DISCIPLINE_LABELS.FISCALIZACAO,
    description: "Vistorias, pontos de controle e registros de conformidade.",
    accentClassName: "border-violet-200 bg-violet-50 text-violet-700",
    commonFields: [
      {
        key: "inspectionSeverity",
        label: "Criticidade",
        kind: "select",
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "Média" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Crítica" },
        ],
      },
      {
        key: "correctionDeadline",
        label: "Prazo de correção",
        kind: "date",
      },
    ],
    objectTypes: ["PONTO_FISCALIZACAO", "AREA_FISCALIZADA"],
  },
  MOBILIDADE: {
    id: "MOBILIDADE",
    label: DISCIPLINE_LABELS.MOBILIDADE,
    description: "Equipamentos e infraestrutura operacional de mobilidade.",
    accentClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
    commonFields: [
      {
        key: "mobilityStatus",
        label: "Situação operacional",
        kind: "select",
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "PARCIAL", label: "Parcial" },
          { value: "INOPERANTE", label: "Inoperante" },
        ],
      },
    ],
    objectTypes: ["PONTO_ONIBUS", "RADAR"],
  },
  SANEAMENTO: {
    id: "SANEAMENTO",
    label: DISCIPLINE_LABELS.SANEAMENTO,
    description: "Ativos de água, esgoto e apoio hidráulico.",
    accentClassName: "border-blue-200 bg-blue-50 text-blue-700",
    commonFields: [
      {
        key: "networkType",
        label: "Rede associada",
        kind: "select",
        options: [
          { value: "AGUA", label: "Água" },
          { value: "ESGOTO", label: "Esgoto" },
          { value: "INCENDIO", label: "Incêndio" },
        ],
      },
    ],
    objectTypes: ["HIDRANTE"],
  },
  EDIFICACOES: {
    id: "EDIFICACOES",
    label: DISCIPLINE_LABELS.EDIFICACOES,
    description: "Equipamentos públicos e perímetros edificados.",
    accentClassName: "border-slate-200 bg-slate-100 text-slate-700",
    commonFields: [
      {
        key: "buildingUse",
        label: "Uso predominante",
        kind: "text",
        placeholder: "Escola, posto, unidade administrativa...",
      },
    ],
    objectTypes: ["EDIFICACAO_PUBLICA"],
  },
  ZELADORIA: {
    id: "ZELADORIA",
    label: DISCIPLINE_LABELS.ZELADORIA,
    description: "Equipamentos de apoio urbano e manutenção cotidiana.",
    accentClassName: "border-zinc-200 bg-zinc-100 text-zinc-700",
    commonFields: [
      {
        key: "maintenanceStatus",
        label: "Situação",
        kind: "select",
        options: [
          { value: "ATIVA", label: "Ativa" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "PENDENTE", label: "Pendente" },
        ],
      },
    ],
    objectTypes: ["LIXEIRA"],
  },
  OBRAS: {
    id: "OBRAS",
    label: DISCIPLINE_LABELS.OBRAS,
    description: "Frentes executivas, canteiro e apoio transversal ao projeto.",
    accentClassName: "border-stone-200 bg-stone-100 text-stone-700",
    commonFields: [
      {
        key: "executionFront",
        label: "Frente executiva",
        kind: "text",
        placeholder: "Ex.: trecho norte, lote 02, setor A...",
      },
      {
        key: "contractor",
        label: "Contratada",
        kind: "text",
        placeholder: "Nome da empresa executora",
      },
    ],
    objectTypes: ["FRENTE_OBRA", "EQUIPAMENTO_OBRA"],
  },
};

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function isProjectDisciplineId(value: string): value is ProjectDisciplineId {
  return (PROJECT_DISCIPLINE_IDS as readonly string[]).includes(value);
}

export function isTechnicalObjectType(value: string): value is TechnicalObjectTypeId {
  return (TECHNICAL_OBJECT_TYPE_IDS as readonly string[]).includes(value);
}

export function getProjectDisciplineLabel(value: ProjectDisciplineId) {
  return DISCIPLINE_LABELS[value] ?? titleCase(value);
}

export function getProjectDisciplineDefinition(value: ProjectDisciplineId) {
  return PROJECT_DISCIPLINE_DEFINITIONS[value];
}

export function getTechnicalObjectDefinition(value: TechnicalObjectTypeId) {
  return TECHNICAL_OBJECT_DEFINITIONS[value];
}

export function getTechnicalObjectLabel(value: TechnicalObjectTypeId) {
  return getTechnicalObjectDefinition(value)?.label ?? titleCase(value);
}

export function getEnabledProjectDisciplines(projectAreas: ProjectTechnicalArea[]) {
  const enabled = new Set<ProjectDisciplineId>();

  for (const area of projectAreas) {
    if (isProjectDisciplineId(area)) enabled.add(area);
  }

  enabled.add("OBRAS");

  return PROJECT_DISCIPLINE_IDS.filter((discipline) => enabled.has(discipline));
}

export function getDisciplineObjectTypes(discipline: ProjectDisciplineId) {
  return PROJECT_DISCIPLINE_DEFINITIONS[discipline]?.objectTypes.map(
    (objectType) => TECHNICAL_OBJECT_DEFINITIONS[objectType]
  ) ?? [];
}

export function getTechnicalFieldsForContext(
  discipline: ProjectDisciplineId | null,
  technicalObjectType: TechnicalObjectTypeId | null
) {
  const disciplineFields = discipline
    ? PROJECT_DISCIPLINE_DEFINITIONS[discipline]?.commonFields ?? []
    : [];
  const objectFields = technicalObjectType
    ? TECHNICAL_OBJECT_DEFINITIONS[technicalObjectType]?.fields ?? []
    : [];

  const unique = new Map<string, TechnicalFieldDefinition>();
  for (const field of [...disciplineFields, ...objectFields]) {
    unique.set(field.key, field);
  }

  return Array.from(unique.values());
}

export function resolveTechnicalObjectType(
  featureType?: string | null,
  attributes?: Record<string, unknown> | null
) {
  const direct = typeof attributes?.technicalObjectType === "string"
    ? attributes.technicalObjectType
    : null;
  if (direct && isTechnicalObjectType(direct)) return direct;

  const subType = typeof attributes?.subType === "string" ? attributes.subType : null;
  if (subType && isTechnicalObjectType(subType)) return subType;

  if (featureType && isTechnicalObjectType(featureType)) return featureType;

  return null;
}

export function resolveTechnicalArea(
  featureType?: string | null,
  attributes?: Record<string, unknown> | null,
  fallbackArea?: ProjectDisciplineId | null
) {
  const direct = typeof attributes?.technicalArea === "string"
    ? attributes.technicalArea
    : null;

  if (direct && isProjectDisciplineId(direct)) return direct;

  const objectType = resolveTechnicalObjectType(featureType, attributes);
  if (objectType) {
    return TECHNICAL_OBJECT_DEFINITIONS[objectType]?.area ?? fallbackArea ?? null;
  }

  return fallbackArea ?? null;
}

export function coerceTechnicalFieldValue(
  field: TechnicalFieldDefinition,
  value: string
): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (field.kind === "number") {
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : trimmed;
  }

  return trimmed;
}

export function validateTechnicalFieldValues(
  fields: TechnicalFieldDefinition[],
  values: Record<string, string>
) {
  const errors: string[] = [];

  for (const field of fields) {
    const rawValue = values[field.key] ?? "";
    const trimmed = rawValue.trim();

    if (field.required && trimmed.length === 0) {
      errors.push(`${field.label} é obrigatório.`);
      continue;
    }

    if (!trimmed.length) continue;

    if (field.kind === "number") {
      const parsed = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(parsed)) {
        errors.push(`${field.label} deve ser numérico.`);
        continue;
      }
      if (field.min !== undefined && parsed < field.min) {
        errors.push(`${field.label} deve ser maior ou igual a ${field.min}.`);
      }
      if (field.max !== undefined && parsed > field.max) {
        errors.push(`${field.label} deve ser menor ou igual a ${field.max}.`);
      }
    }
  }

  return errors;
}

export function buildTechnicalDataPayload(
  fields: TechnicalFieldDefinition[],
  values: Record<string, string>
) {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const coerced = coerceTechnicalFieldValue(field, values[field.key] ?? "");
    if (coerced !== null && coerced !== undefined && coerced !== "") {
      payload[field.key] = coerced;
    }
  }

  return payload;
}

export function readTechnicalFieldValues(
  fields: TechnicalFieldDefinition[],
  attributes?: Record<string, unknown> | null
) {
  const source =
    attributes?.technicalData && typeof attributes.technicalData === "object"
      ? (attributes.technicalData as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    fields.map((field) => {
      const rawValue = source[field.key];
      return [field.key, rawValue == null ? "" : String(rawValue)];
    })
  );
}

export function normalizeTechnicalAttributes(attributes: Record<string, unknown>) {
  const nextAttributes = { ...attributes };
  const technicalObjectType = resolveTechnicalObjectType(
    typeof nextAttributes.type === "string" ? nextAttributes.type : null,
    nextAttributes
  );
  const technicalArea = resolveTechnicalArea(
    typeof nextAttributes.type === "string" ? nextAttributes.type : null,
    nextAttributes
  );

  if (
    nextAttributes.technicalArea !== undefined &&
    typeof nextAttributes.technicalArea === "string" &&
    !isProjectDisciplineId(nextAttributes.technicalArea)
  ) {
    throw new Error("Área técnica inválida.");
  }

  if (
    nextAttributes.technicalObjectType !== undefined &&
    typeof nextAttributes.technicalObjectType === "string" &&
    !isTechnicalObjectType(nextAttributes.technicalObjectType)
  ) {
    throw new Error("Tipo de objeto técnico inválido.");
  }

  if (technicalObjectType) {
    const objectDefinition = getTechnicalObjectDefinition(technicalObjectType);
    if (
      technicalArea &&
      objectDefinition &&
      objectDefinition.area !== technicalArea
    ) {
      throw new Error("O tipo de objeto não pertence à área técnica informada.");
    }

    nextAttributes.technicalObjectType = technicalObjectType;
    nextAttributes.subType = technicalObjectType;
  }

  if (technicalArea) {
    nextAttributes.technicalArea = technicalArea;
  }

  if (
    nextAttributes.technicalData !== undefined &&
    (
      !nextAttributes.technicalData ||
      typeof nextAttributes.technicalData !== "object" ||
      Array.isArray(nextAttributes.technicalData)
    )
  ) {
    throw new Error("technicalData deve ser um objeto simples.");
  }

  return nextAttributes;
}
