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
  "TRECHO_DRENAGEM",
  "BOCA_LOBO",
  "POCO_VISITA",
  "CAIXA_LIGACAO",
  "HIDRANTE",
  "GALERIA_PLUVIAL",
  "SARJETA",
  "CANAL",
  "DISSIPADOR",
  "PONTO_ALAGAMENTO",
  "OCORRENCIA_DRENAGEM",
  "SEMAFORO",
  "PLACA_TRANSITO",
  "LOMBADA",
  "PONTO_ONIBUS",
  "RADAR",
  "PINTURA_VIARIA",
  "POSTE_LUZ",
  "LUMINARIA",
  "CIRCUITO_ILUMINACAO",
  "PONTO_APAGADO",
  "OCORRENCIA_MANUTENCAO_ILUMINACAO",
  "ITEM_VISTORIADO_ILUMINACAO",
  "ARVORE",
  "AGRUPAMENTO_ARBOREO",
  "CANTEIRO_ARBORIZACAO",
  "AREA_VERDE",
  "OCORRENCIA_PODA",
  "SUPRESSAO_ARBORIZACAO",
  "RISCO_QUEDA_ARBORIZACAO",
  "CONFLITO_REDE_ARBORIZACAO",
  "LIXEIRA",
  "BURACO",
  "REMENDO_PAVIMENTO",
  "RECAPE_PAVIMENTO",
  "DEFEITO_PAVIMENTO",
  "AFUNDAMENTO_VIARIO",
  "BASE_SUBBASE",
  "TRECHO_PAVIMENTO",
  "FRENTE_SERVICO_PAVIMENTO",
  "PONTO_FISCALIZACAO",
  "AREA_FISCALIZADA",
  "EQUIPAMENTO_OBRA",
  "FRENTE_OBRA",
  "EDIFICACAO_PUBLICA",
] as const;

export type TechnicalObjectTypeId = (typeof TECHNICAL_OBJECT_TYPE_IDS)[number];
export const DRAINAGE_TECHNICAL_OBJECT_TYPE_IDS = [
  "TRECHO_DRENAGEM",
  "BOCA_LOBO",
  "POCO_VISITA",
  "CAIXA_LIGACAO",
  "GALERIA_PLUVIAL",
  "SARJETA",
  "CANAL",
  "DISSIPADOR",
  "PONTO_ALAGAMENTO",
  "OCORRENCIA_DRENAGEM",
] as const satisfies readonly TechnicalObjectTypeId[];
export type DrainageTechnicalObjectTypeId =
  (typeof DRAINAGE_TECHNICAL_OBJECT_TYPE_IDS)[number];
export const PAVEMENT_TECHNICAL_OBJECT_TYPE_IDS = [
  "TRECHO_PAVIMENTO",
  "REMENDO_PAVIMENTO",
  "RECAPE_PAVIMENTO",
  "DEFEITO_PAVIMENTO",
  "BURACO",
  "AFUNDAMENTO_VIARIO",
  "BASE_SUBBASE",
  "FRENTE_SERVICO_PAVIMENTO",
] as const satisfies readonly TechnicalObjectTypeId[];
export type PavementTechnicalObjectTypeId =
  (typeof PAVEMENT_TECHNICAL_OBJECT_TYPE_IDS)[number];
export const LIGHTING_TECHNICAL_OBJECT_TYPE_IDS = [
  "POSTE_LUZ",
  "LUMINARIA",
  "CIRCUITO_ILUMINACAO",
  "PONTO_APAGADO",
  "OCORRENCIA_MANUTENCAO_ILUMINACAO",
  "ITEM_VISTORIADO_ILUMINACAO",
] as const satisfies readonly TechnicalObjectTypeId[];
export type LightingTechnicalObjectTypeId =
  (typeof LIGHTING_TECHNICAL_OBJECT_TYPE_IDS)[number];
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
  PAVIMENTACAO: "PavimentaÃ§Ã£o",
  ILUMINACAO: "IluminaÃ§Ã£o pÃºblica",
  ARBORIZACAO: "Arborização",
  SINALIZACAO: "SinalizaÃ§Ã£o",
  FISCALIZACAO: "FiscalizaÃ§Ã£o",
  MOBILIDADE: "Mobilidade",
  SANEAMENTO: "Saneamento",
  EDIFICACOES: "EdificaÃ§Ãµes",
  ZELADORIA: "Zeladoria",
  OBRAS: "Obras",
};

const TECHNICAL_OBJECT_DEFINITIONS: Record<TechnicalObjectTypeId, TechnicalObjectDefinition> = {
  TRECHO_DRENAGEM: {
    id: "TRECHO_DRENAGEM",
    area: "DRENAGEM",
    label: "Trecho de drenagem",
    helper: "Segmento linear da rede pluvial",
    geometry: "line",
    fields: [
      {
        key: "drainageSegmentType",
        label: "Tipo do trecho",
        kind: "select",
        required: true,
        options: [
          { value: "COLETOR", label: "Coletor" },
          { value: "RAMAL", label: "Ramal" },
          { value: "DESCIDA", label: "Descida" },
          { value: "DESCARGA", label: "Descarga" },
        ],
      },
      {
        key: "diameterMm",
        label: "Di?metro nominal",
        kind: "select",
        required: true,
        options: [
          { value: "300", label: "300 mm" },
          { value: "400", label: "400 mm" },
          { value: "500", label: "500 mm" },
          { value: "600", label: "600 mm" },
          { value: "800", label: "800 mm" },
          { value: "1000", label: "1000 mm" },
          { value: "1200", label: "1200 mm" },
          { value: "1500", label: "1500 mm" },
          { value: "2000", label: "2000 mm ou mais" },
        ],
      },
      {
        key: "sectionType",
        label: "Tipo de se??o",
        kind: "select",
        required: true,
        options: [
          { value: "TUBULAR", label: "Tubular" },
          { value: "RETANGULAR", label: "Retangular" },
          { value: "TRAPEZOIDAL", label: "Trapezoidal" },
          { value: "OVOIDE", label: "Ovoide" },
          { value: "ABERTA", label: "Aberta" },
        ],
      },
      {
        key: "depthClass",
        label: "Profundidade",
        kind: "select",
        required: true,
        options: [
          { value: "ATE_1M", label: "At? 1,0 m" },
          { value: "DE_1_A_2M", label: "De 1,0 a 2,0 m" },
          { value: "DE_2_A_4M", label: "De 2,0 a 4,0 m" },
          { value: "ACIMA_4M", label: "Acima de 4,0 m" },
        ],
      },
      {
        key: "assetCondition",
        label: "Condi??o",
        kind: "select",
        required: true,
        options: [
          { value: "BOA", label: "Boa" },
          { value: "REGULAR", label: "Regular" },
          { value: "RUIM", label: "Ruim" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        required: true,
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "PARCIAL", label: "Parcial" },
          { value: "OBSTRUIDO", label: "Obstru?do" },
          { value: "INTERDITADO", label: "Interditado" },
          { value: "MANUTENCAO", label: "Em manuten??o" },
        ],
      },
      {
        key: "priority",
        label: "Prioridade de manuten??o",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "URGENTE", label: "Urgente" },
        ],
      },
      {
        key: "criticality",
        label: "Criticidade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
    ],
  },
  BOCA_LOBO: {
    id: "BOCA_LOBO",
    area: "DRENAGEM",
    label: "Boca de lobo",
    helper: "CaptaÃ§Ã£o superficial",
    geometry: "point",
    fields: [
      {
        key: "gratingState",
        label: "Estado da grelha",
        kind: "select",
        options: [
          { value: "INTEGRA", label: "Ãntegra" },
          { value: "DANIFICADA", label: "Danificada" },
          { value: "AUSENTE", label: "Ausente" },
        ],
      },
      {
        key: "inletType",
        label: "Tipo de captaÃ§Ã£o",
        kind: "select",
        options: [
          { value: "GUIA", label: "Guia" },
          { value: "GRELHA", label: "Grelha" },
          { value: "COMBINADA", label: "Combinada" },
        ],
      },
    ],
  },
  POCO_VISITA: {
    id: "POCO_VISITA",
    area: "DRENAGEM",
    label: "PoÃ§o de visita",
    helper: "Acesso Ã  rede subterrÃ¢nea",
    geometry: "point",
    fields: [
      {
        key: "depthMeters",
        label: "Profundidade (m)",
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        key: "coverState",
        label: "Estado da tampa",
        kind: "select",
        options: [
          { value: "INTEGRA", label: "Ãntegra" },
          { value: "TRINCADA", label: "Trincada" },
          { value: "AUSENTE", label: "Ausente" },
        ],
      },
    ],
  },
  CAIXA_LIGACAO: {
    id: "CAIXA_LIGACAO",
    area: "DRENAGEM",
    label: "Caixa de ligaÃ§Ã£o",
    helper: "Caixa de inspeÃ§Ã£o ou interligaÃ§Ã£o da rede",
    geometry: "point",
    fields: [
      {
        key: "junctionBoxType",
        label: "Tipo de caixa",
        kind: "select",
        options: [
          { value: "PASSAGEM", label: "Passagem" },
          { value: "INSPECAO", label: "InspeÃ§Ã£o" },
          { value: "LIGACAO", label: "LigaÃ§Ã£o" },
        ],
      },
      {
        key: "boxMaterial",
        label: "Material",
        kind: "select",
        options: [
          { value: "CONCRETO", label: "Concreto" },
          { value: "ALVENARIA", label: "Alvenaria" },
          { value: "PVC", label: "PVC" },
        ],
      },
    ],
  },
  HIDRANTE: {
    id: "HIDRANTE",
    area: "SANEAMENTO",
    label: "Hidrante",
    helper: "Combate a incÃªndio",
    geometry: "point",
  },
  GALERIA_PLUVIAL: {
    id: "GALERIA_PLUVIAL",
    area: "DRENAGEM",
    label: "Galeria",
    helper: "Galeria fechada da rede pluvial",
    geometry: "line",
    fields: [
      {
        key: "gallerySection",
        label: "SeÃ§Ã£o da galeria",
        kind: "select",
        options: [
          { value: "TUBULAR", label: "Tubular" },
          { value: "CELULAR", label: "Celular" },
          { value: "ADUELA", label: "Aduela" },
        ],
      },
      {
        key: "internalWidthMeters",
        label: "Largura interna (m)",
        kind: "number",
        min: 0,
        max: 20,
      },
      {
        key: "internalHeightMeters",
        label: "Altura interna (m)",
        kind: "number",
        min: 0,
        max: 20,
      },
    ],
  },
  SARJETA: {
    id: "SARJETA",
    area: "DRENAGEM",
    label: "Sarjeta",
    helper: "Escoamento superficial junto ao meio-fio",
    geometry: "line",
    fields: [
      {
        key: "gutterProfile",
        label: "Perfil",
        kind: "select",
        options: [
          { value: "CONCRETO", label: "Concreto" },
          { value: "ASFALTO", label: "Asfalto" },
          { value: "NATURAL", label: "Natural" },
        ],
      },
      {
        key: "widthMeters",
        label: "Largura mÃ©dia (m)",
        kind: "number",
        min: 0,
        max: 10,
      },
    ],
  },
  CANAL: {
    id: "CANAL",
    area: "DRENAGEM",
    label: "Canal",
    helper: "Trecho de canal aberto de drenagem",
    geometry: "line",
    fields: [
      {
        key: "liningType",
        label: "Revestimento",
        kind: "select",
        options: [
          { value: "CONCRETO", label: "Concreto" },
          { value: "ENROCAMENTO", label: "Enrocamento" },
          { value: "SOLO", label: "Solo" },
          { value: "MISTO", label: "Misto" },
        ],
      },
      {
        key: "channelWidthMeters",
        label: "Largura (m)",
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        key: "channelDepthMeters",
        label: "Profundidade (m)",
        kind: "number",
        min: 0,
        max: 30,
      },
    ],
  },
  DISSIPADOR: {
    id: "DISSIPADOR",
    area: "DRENAGEM",
    label: "Dissipador",
    helper: "Estrutura de dissipaÃ§Ã£o de energia hidrÃ¡ulica",
    geometry: "point",
    fields: [
      {
        key: "dissipatorType",
        label: "Tipo",
        kind: "select",
        options: [
          { value: "ESCADA_HIDRAULICA", label: "Escada hidrÃ¡ulica" },
          { value: "BLOCO_DISSIPADOR", label: "Bloco dissipador" },
          { value: "BACIA_DISSIPACAO", label: "Bacia de dissipaÃ§Ã£o" },
        ],
      },
      {
        key: "structureCondition",
        label: "CondiÃ§Ã£o estrutural",
        kind: "select",
        options: [
          { value: "BOA", label: "Boa" },
          { value: "REGULAR", label: "Regular" },
          { value: "CRITICA", label: "CrÃ­tica" },
        ],
      },
    ],
  },
  PONTO_ALAGAMENTO: {
    id: "PONTO_ALAGAMENTO",
    area: "DRENAGEM",
    label: "Ponto de alagamento",
    helper: "Ponto recorrente de acÃºmulo de Ã¡gua",
    geometry: "point",
    fields: [
      {
        key: "recurrence",
        label: "RecorrÃªncia",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "MÃ©dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "CrÃ­tica" },
        ],
      },
      {
        key: "floodDepthCm",
        label: "LÃ¢mina d'Ã¡gua (cm)",
        kind: "number",
        min: 0,
        max: 500,
      },
      {
        key: "impactLevel",
        label: "Impacto",
        kind: "select",
        options: [
          { value: "LOCAL", label: "Local" },
          { value: "VIARIO", label: "ViÃ¡rio" },
          { value: "EDIFICACOES", label: "EdificaÃ§Ãµes" },
          { value: "GENERALIZADO", label: "Generalizado" },
        ],
      },
    ],
  },
  OCORRENCIA_DRENAGEM: {
    id: "OCORRENCIA_DRENAGEM",
    area: "DRENAGEM",
    label: "OcorrÃªncia de obstruÃ§Ã£o/manutenÃ§Ã£o",
    helper: "Registro operacional de manutenÃ§Ã£o na rede de drenagem",
    geometry: "point",
    fields: [
      {
        key: "maintenanceType",
        label: "Tipo de ocorrÃªncia",
        kind: "select",
        required: true,
        options: [
          { value: "OBSTRUCAO", label: "ObstruÃ§Ã£o" },
          { value: "LIMPEZA", label: "Limpeza" },
          { value: "DESASSOREAMENTO", label: "Desassoreamento" },
          { value: "REPARO", label: "Reparo" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status",
        kind: "select",
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_EXECUCAO", label: "Em execuÃ§Ã£o" },
          { value: "CONCLUIDA", label: "ConcluÃ­da" },
        ],
      },
      {
        key: "priority",
        label: "Prioridade",
        kind: "select",
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "MÃ©dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "CrÃ­tica" },
        ],
      },
      {
        key: "openedAt",
        label: "Data da ocorrÃªncia",
        kind: "date",
      },
    ],
  },
  SEMAFORO: {
    id: "SEMAFORO",
    area: "SINALIZACAO",
    label: "SemÃ¡foro",
    helper: "Controle semafÃ³rico",
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
    label: "Placa de trÃ¢nsito",
    helper: "SinalizaÃ§Ã£o vertical",
    geometry: "point",
    fields: [
      {
        key: "plateCategory",
        label: "Categoria",
        kind: "select",
        options: [
          { value: "REGULAMENTACAO", label: "RegulamentaÃ§Ã£o" },
          { value: "ADVERTENCIA", label: "AdvertÃªncia" },
          { value: "INDICACAO", label: "IndicaÃ§Ã£o" },
        ],
      },
    ],
  },
  LOMBADA: {
    id: "LOMBADA",
    area: "SINALIZACAO",
    label: "Lombada",
    helper: "ModeraÃ§Ã£o de trÃ¡fego",
    geometry: "point",
  },
  PONTO_ONIBUS: {
    id: "PONTO_ONIBUS",
    area: "MOBILIDADE",
    label: "Ponto de Ã´nibus",
    helper: "Equipamento de mobilidade",
    geometry: "point",
  },
  RADAR: {
    id: "RADAR",
    area: "MOBILIDADE",
    label: "Radar",
    helper: "FiscalizaÃ§Ã£o eletrÃ´nica",
    geometry: "point",
  },
  PINTURA_VIARIA: {
    id: "PINTURA_VIARIA",
    area: "SINALIZACAO",
    label: "Pintura viÃ¡ria",
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
    label: "Poste",
    helper: "Poste operacional vinculado ? infraestrutura importada quando houver.",
    geometry: "point",
    fields: [
      {
        key: "assetOrigin",
        label: "Origem do dado",
        kind: "select",
        options: [
          { value: "IMPORTADO_REFERENCIADO", label: "Referenciado na base importada" },
          { value: "OPERACIONAL_NOVO", label: "Operacional do projeto" },
        ],
      },
      {
        key: "supportMaterial",
        label: "Material do poste",
        kind: "select",
        options: [
          { value: "CONCRETO", label: "Concreto" },
          { value: "METALICO", label: "Met?lico" },
          { value: "MADEIRA", label: "Madeira" },
          { value: "FIBRA", label: "Fibra" },
        ],
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        required: true,
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "ATENCAO", label: "Em aten??o" },
          { value: "DANIFICADO", label: "Danificado" },
          { value: "DESATIVADO", label: "Desativado" },
        ],
      },
    ],
  },
  LUMINARIA: {
    id: "LUMINARIA",
    area: "ILUMINACAO",
    label: "Ponto de ilumina??o",
    helper: "Lumin?ria ou ponto operacional associado ? ilumina??o p?blica.",
    geometry: "point",
    fields: [
      {
        key: "luminaireType",
        label: "Tipo de lumin?ria",
        kind: "select",
        options: [
          { value: "LED", label: "LED" },
          { value: "VAPOR_SODIO", label: "Vapor de s?dio" },
          { value: "VAPOR_METALICO", label: "Vapor met?lico" },
          { value: "SOLAR", label: "Solar" },
        ],
      },
      {
        key: "powerWatts",
        label: "Pot?ncia (W)",
        kind: "number",
        min: 1,
        max: 2000,
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        required: true,
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "PARCIAL", label: "Parcial" },
          { value: "APAGADO", label: "Apagado" },
          { value: "MANUTENCAO", label: "Em manuten??o" },
        ],
      },
    ],
  },
  CIRCUITO_ILUMINACAO: {
    id: "CIRCUITO_ILUMINACAO",
    area: "ILUMINACAO",
    label: "Circuito de ilumina??o",
    helper: "Trecho linear ou eixo operacional associado a um circuito, quando houver suporte.",
    geometry: "line",
    fields: [
      {
        key: "powerCircuit",
        label: "Circuito",
        kind: "text",
        required: true,
        placeholder: "Ex.: CIR-12",
      },
      {
        key: "circuitPhase",
        label: "Fase",
        kind: "select",
        options: [
          { value: "MONOFASICO", label: "Monof?sico" },
          { value: "BIFASICO", label: "Bif?sico" },
          { value: "TRIFASICO", label: "Trif?sico" },
        ],
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        required: true,
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "ATENCAO", label: "Em aten??o" },
          { value: "INTERMITENTE", label: "Intermitente" },
          { value: "DESENERGIZADO", label: "Desenergizado" },
        ],
      },
    ],
  },
  PONTO_APAGADO: {
    id: "PONTO_APAGADO",
    area: "ILUMINACAO",
    label: "Ponto apagado",
    helper: "Registro operacional de ponto sem ilumina??o ou com falha percebida.",
    geometry: "point",
    fields: [
      {
        key: "outageType",
        label: "Tipo de falha",
        kind: "select",
        required: true,
        options: [
          { value: "APAGADO_TOTAL", label: "Apagado total" },
          { value: "INTERMITENTE", label: "Intermitente" },
          { value: "PISCANDO", label: "Piscando" },
          { value: "BAIXA_ILUMINACAO", label: "Baixa ilumina??o" },
        ],
      },
      {
        key: "maintenancePriority",
        label: "Prioridade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTO", label: "Aberto" },
          { value: "EM_ATENDIMENTO", label: "Em atendimento" },
          { value: "PROGRAMADO", label: "Programado" },
          { value: "NORMALIZADO", label: "Normalizado" },
        ],
      },
    ],
  },
  OCORRENCIA_MANUTENCAO_ILUMINACAO: {
    id: "OCORRENCIA_MANUTENCAO_ILUMINACAO",
    area: "ILUMINACAO",
    label: "Ocorr?ncia de manuten??o",
    helper: "Chamado, manuten??o corretiva ou preventiva ligado ? ilumina??o.",
    geometry: "point",
    fields: [
      {
        key: "maintenanceType",
        label: "Tipo de manuten??o",
        kind: "select",
        required: true,
        options: [
          { value: "CORRETIVA", label: "Corretiva" },
          { value: "PREVENTIVA", label: "Preventiva" },
          { value: "INSPECAO", label: "Inspe??o" },
          { value: "AMPLIACAO", label: "Amplia??o" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status da ocorr?ncia",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "CONCLUIDA", label: "Conclu?da" },
        ],
      },
      {
        key: "maintenancePriority",
        label: "Prioridade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
    ],
  },
  ITEM_VISTORIADO_ILUMINACAO: {
    id: "ITEM_VISTORIADO_ILUMINACAO",
    area: "ILUMINACAO",
    label: "Item vistoriado",
    helper: "Vistoria t?cnica vinculada ? infraestrutura el?trica ou ao ativo operacional.",
    geometry: "point",
    fields: [
      {
        key: "inspectionResult",
        label: "Resultado da vistoria",
        kind: "select",
        required: true,
        options: [
          { value: "CONFORME", label: "Conforme" },
          { value: "COM_RESTRICAO", label: "Com restri??o" },
          { value: "NAO_CONFORME", label: "N?o conforme" },
        ],
      },
      {
        key: "inspectionTeam",
        label: "Equipe respons?vel",
        kind: "text",
        placeholder: "Ex.: Fiscaliza??o de ilumina??o",
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        options: [
          { value: "REGISTRADO", label: "Registrado" },
          { value: "EM_ANALISE", label: "Em an?lise" },
          { value: "ENCAMINHADO", label: "Encaminhado" },
          { value: "CONCLUIDO", label: "Conclu?do" },
        ],
      },
    ],
  },
  ARVORE: {
    id: "ARVORE",
    area: "ARBORIZACAO",
    label: "Árvore",
    helper: "Elemento arbóreo individual com cadastro técnico e operacional.",
    geometry: "point",
    fields: [
      {
        key: "botanicalName",
        label: "Nome botânico",
        kind: "text",
        placeholder: "Ex.: Handroanthus impetiginosus",
      },
      {
        key: "treeCondition",
        label: "Condição",
        kind: "select",
        required: true,
        options: [
          { value: "SAUDAVEL", label: "Saudável" },
          { value: "PRECISA_PODA", label: "Precisa de poda" },
          { value: "EM_RISCO", label: "Em risco" },
        ],
      },
      {
        key: "riskLevel",
        label: "Risco",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
      {
        key: "trunkDiameterCm",
        label: "DAP aproximado (cm)",
        kind: "number",
        min: 0,
        max: 500,
      },
    ],
  },
  AGRUPAMENTO_ARBOREO: {
    id: "AGRUPAMENTO_ARBOREO",
    area: "ARBORIZACAO",
    label: "Agrupamento arbóreo",
    helper: "Conjunto de árvores com leitura espacial e manejo em grupo.",
    geometry: "polygon",
    fields: [
      {
        key: "treeCountEstimate",
        label: "Quantidade estimada",
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        key: "treeCondition",
        label: "Condição predominante",
        kind: "select",
        required: true,
        options: [
          { value: "SAUDAVEL", label: "Saudável" },
          { value: "PRECISA_PODA", label: "Precisa de poda" },
          { value: "EM_RISCO", label: "Em risco" },
        ],
      },
      {
        key: "riskLevel",
        label: "Risco predominante",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
  },
  CANTEIRO_ARBORIZACAO: {
    id: "CANTEIRO_ARBORIZACAO",
    area: "ARBORIZACAO",
    label: "Canteiro",
    helper: "Área de plantio, recomposição ou apoio à arborização urbana.",
    geometry: "polygon",
    fields: [
      {
        key: "bedType",
        label: "Tipo de canteiro",
        kind: "select",
        options: [
          { value: "VIARIO", label: "Viário" },
          { value: "PRACA", label: "Praça" },
          { value: "CALCADA", label: "Calçada" },
          { value: "PARQUE", label: "Parque" },
        ],
      },
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
      {
        key: "riskLevel",
        label: "Risco",
        kind: "select",
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
  },
  AREA_VERDE: {
    id: "AREA_VERDE",
    area: "ARBORIZACAO",
    label: "Área verde",
    helper: "Perímetro de cobertura vegetal ou área ambiental associada ao projeto.",
    geometry: "polygon",
    fields: [
      {
        key: "greenAreaType",
        label: "Tipo de área",
        kind: "select",
        options: [
          { value: "PRACA", label: "Praça" },
          { value: "PARQUE", label: "Parque" },
          { value: "CORREDOR_VERDE", label: "Corredor verde" },
          { value: "APP", label: "Área protegida" },
        ],
      },
      {
        key: "treeCondition",
        label: "Condição predominante",
        kind: "select",
        options: [
          { value: "SAUDAVEL", label: "Saudável" },
          { value: "PRECISA_PODA", label: "Precisa de poda" },
          { value: "EM_RISCO", label: "Em risco" },
        ],
      },
      {
        key: "riskLevel",
        label: "Risco predominante",
        kind: "select",
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
  },
  OCORRENCIA_PODA: {
    id: "OCORRENCIA_PODA",
    area: "ARBORIZACAO",
    label: "Ocorrência de poda",
    helper: "Registro operacional de poda corretiva, preventiva ou emergencial.",
    geometry: "point",
    fields: [
      {
        key: "pruningType",
        label: "Tipo de poda",
        kind: "select",
        required: true,
        options: [
          { value: "FORMACAO", label: "Formação" },
          { value: "LIMPEZA", label: "Limpeza" },
          { value: "CORRETIVA", label: "Corretiva" },
          { value: "EMERGENCIAL", label: "Emergencial" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status da ocorrência",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "CONCLUIDA", label: "Concluída" },
        ],
      },
      {
        key: "riskLevel",
        label: "Risco",
        kind: "select",
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
  },
  SUPRESSAO_ARBORIZACAO: {
    id: "SUPRESSAO_ARBORIZACAO",
    area: "ARBORIZACAO",
    label: "Supressão",
    helper: "Solicitação ou execução de supressão de elemento arbóreo.",
    geometry: "point",
    fields: [
      {
        key: "suppressionReason",
        label: "Motivo da supressão",
        kind: "select",
        required: true,
        options: [
          { value: "DOENCA", label: "Doença" },
          { value: "RISCO", label: "Risco" },
          { value: "OBRA", label: "Obra" },
          { value: "CONFLITO_REDE", label: "Conflito com rede" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status da supressão",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "AUTORIZADA", label: "Autorizada" },
          { value: "CONCLUIDA", label: "Concluída" },
        ],
      },
      {
        key: "riskLevel",
        label: "Risco",
        kind: "select",
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
  },
  RISCO_QUEDA_ARBORIZACAO: {
    id: "RISCO_QUEDA_ARBORIZACAO",
    area: "ARBORIZACAO",
    label: "Risco de queda",
    helper: "Registro de risco estrutural, tombamento ou queda de árvore.",
    geometry: "point",
    fields: [
      {
        key: "riskTarget",
        label: "Alvo em risco",
        kind: "select",
        required: true,
        options: [
          { value: "PEDESTRE", label: "Pedestre" },
          { value: "IMOVEL", label: "Imóvel" },
          { value: "VIARIO", label: "Viário" },
          { value: "REDE", label: "Rede" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status do risco",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "CONCLUIDA", label: "Concluída" },
        ],
      },
      {
        key: "riskLevel",
        label: "Nível de risco",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
  },
  CONFLITO_REDE_ARBORIZACAO: {
    id: "CONFLITO_REDE_ARBORIZACAO",
    area: "ARBORIZACAO",
    label: "Conflito com rede",
    helper: "Interferência entre arborização e rede elétrica, telecom ou iluminação.",
    geometry: "point",
    fields: [
      {
        key: "networkConflictType",
        label: "Tipo de conflito",
        kind: "select",
        required: true,
        options: [
          { value: "ELETRICA", label: "Rede elétrica" },
          { value: "TELECOM", label: "Telecom" },
          { value: "ILUMINACAO", label: "Iluminação pública" },
          { value: "SINALIZACAO", label: "Sinalização" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status do conflito",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "CONCLUIDA", label: "Concluída" },
        ],
      },
      {
        key: "riskLevel",
        label: "Risco",
        kind: "select",
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
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
    helper: "Ocorr?ncia pontual de degrada??o do revestimento",
    geometry: "point",
    fields: [
      {
        key: "diameterCm",
        label: "Di?metro aproximado (cm)",
        kind: "number",
        min: 0,
        max: 500,
      },
      {
        key: "depthCm",
        label: "Profundidade aproximada (cm)",
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        key: "severity",
        label: "Severidade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status da ocorr?ncia",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "RESOLVIDA", label: "Resolvida" },
        ],
      },
    ],
  },
  REMENDO_PAVIMENTO: {
    id: "REMENDO_PAVIMENTO",
    area: "PAVIMENTACAO",
    label: "Remendo",
    helper: "?rea localizada de remendo ou corre??o superficial",
    geometry: "polygon",
    fields: [
      {
        key: "patchMaterial",
        label: "Material aplicado",
        kind: "select",
        required: true,
        options: [
          { value: "CBUQ", label: "CBUQ" },
          { value: "PMF", label: "PMF" },
          { value: "CONCRETO", label: "Concreto" },
          { value: "BLOCO", label: "Bloco intertravado" },
        ],
      },
      {
        key: "patchReason",
        label: "Motivo do remendo",
        kind: "select",
        options: [
          { value: "BURACO", label: "Corre??o de buraco" },
          { value: "TRINCAS", label: "Trincas" },
          { value: "AFUNDAMENTO", label: "Afundamento" },
          { value: "MANUTENCAO", label: "Manuten??o" },
        ],
      },
      {
        key: "executionStatus",
        label: "Situa??o da execu??o",
        kind: "select",
        options: [
          { value: "PLANEJADO", label: "Planejado" },
          { value: "EXECUCAO", label: "Em execu??o" },
          { value: "CONCLUIDO", label: "Conclu?do" },
        ],
      },
    ],
  },
  RECAPE_PAVIMENTO: {
    id: "RECAPE_PAVIMENTO",
    area: "PAVIMENTACAO",
    label: "Recape",
    helper: "?rea cont?nua de recapeamento ou refor?o do revestimento",
    geometry: "polygon",
    fields: [
      {
        key: "overlayType",
        label: "Tipo de recape",
        kind: "select",
        required: true,
        options: [
          { value: "CBUQ", label: "CBUQ" },
          { value: "MICRORREVESTIMENTO", label: "Microrrevestimento" },
          { value: "LAMA_ASFALTICA", label: "Lama asf?ltica" },
          { value: "CONCRETO", label: "Concreto" },
        ],
      },
      {
        key: "thicknessCm",
        label: "Espessura (cm)",
        kind: "number",
        min: 0,
        max: 50,
      },
      {
        key: "executionStatus",
        label: "Situa??o da execu??o",
        kind: "select",
        options: [
          { value: "PLANEJADO", label: "Planejado" },
          { value: "EXECUCAO", label: "Em execu??o" },
          { value: "CONCLUIDO", label: "Conclu?do" },
        ],
      },
    ],
  },
  DEFEITO_PAVIMENTO: {
    id: "DEFEITO_PAVIMENTO",
    area: "PAVIMENTACAO",
    label: "Defeito / patologia",
    helper: "Registro pontual de patologia superficial ou estrutural",
    geometry: "point",
    fields: [
      {
        key: "pathologyType",
        label: "Tipo de patologia",
        kind: "select",
        required: true,
        options: [
          { value: "TRINCA", label: "Trinca" },
          { value: "PANELA", label: "Panela" },
          { value: "DESAGREGACAO", label: "Desagrega??o" },
          { value: "EXSUDACAO", label: "Exsuda??o" },
          { value: "CORRUGACAO", label: "Corruga??o" },
        ],
      },
      {
        key: "severity",
        label: "Severidade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status da ocorr?ncia",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "RESOLVIDA", label: "Resolvida" },
        ],
      },
    ],
  },
  AFUNDAMENTO_VIARIO: {
    id: "AFUNDAMENTO_VIARIO",
    area: "PAVIMENTACAO",
    label: "Afundamento",
    helper: "Ponto cr?tico com recalque ou deforma??o do leito vi?rio",
    geometry: "point",
    fields: [
      {
        key: "settlementType",
        label: "Tipo de afundamento",
        kind: "select",
        options: [
          { value: "RECALQUE", label: "Recalque" },
          { value: "ONDULACAO", label: "Ondula??o" },
          { value: "TRILHA_RODA", label: "Trilha de roda" },
          { value: "COLAPSO", label: "Colapso localizado" },
        ],
      },
      {
        key: "severity",
        label: "Severidade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
      {
        key: "occurrenceStatus",
        label: "Status da ocorr?ncia",
        kind: "select",
        required: true,
        options: [
          { value: "ABERTA", label: "Aberta" },
          { value: "EM_TRATAMENTO", label: "Em tratamento" },
          { value: "PROGRAMADA", label: "Programada" },
          { value: "RESOLVIDA", label: "Resolvida" },
        ],
      },
    ],
  },
  BASE_SUBBASE: {
    id: "BASE_SUBBASE",
    area: "PAVIMENTACAO",
    label: "Base / sub-base",
    helper: "?rea executiva da estrutura inferior do pavimento",
    geometry: "polygon",
    fields: [
      {
        key: "layerType",
        label: "Camada",
        kind: "select",
        required: true,
        options: [
          { value: "BASE", label: "Base" },
          { value: "SUBBASE", label: "Sub-base" },
          { value: "REFORCO_SUBLEITO", label: "Refor?o de subleito" },
        ],
      },
      {
        key: "materialType",
        label: "Material",
        kind: "select",
        options: [
          { value: "BRITA_GRADUADA", label: "Brita graduada" },
          { value: "SOLO_CIMENTO", label: "Solo-cimento" },
          { value: "RACHAO", label: "Rach?o" },
          { value: "BGS", label: "BGS" },
        ],
      },
      {
        key: "compactionStatus",
        label: "Compacta??o",
        kind: "select",
        options: [
          { value: "NAO_INICIADA", label: "N?o iniciada" },
          { value: "EM_EXECUCAO", label: "Em execu??o" },
          { value: "CONCLUIDA", label: "Conclu?da" },
        ],
      },
    ],
  },
  TRECHO_PAVIMENTO: {
    id: "TRECHO_PAVIMENTO",
    area: "PAVIMENTACAO",
    label: "Trecho vi?rio",
    helper: "Segmento linear da malha vi?ria ou frente cont?nua de pavimenta??o",
    geometry: "line",
    fields: [
      {
        key: "roadHierarchy",
        label: "Hierarquia vi?ria",
        kind: "select",
        required: true,
        options: [
          { value: "LOCAL", label: "Via local" },
          { value: "COLETORA", label: "Coletora" },
          { value: "ARTERIAL", label: "Arterial" },
          { value: "CORREDOR", label: "Corredor" },
          { value: "RURAL", label: "Trecho rural" },
        ],
      },
      {
        key: "interventionType",
        label: "Tipo de interven??o",
        kind: "select",
        required: true,
        options: [
          { value: "IMPLANTACAO", label: "Implanta??o" },
          { value: "RECUPERACAO", label: "Recupera??o" },
          { value: "MANUTENCAO", label: "Manuten??o" },
          { value: "REQUALIFICACAO", label: "Requalifica??o" },
        ],
      },
      {
        key: "widthSource",
        label: "Origem da largura",
        kind: "select",
        required: true,
        options: [
          { value: "ESTIMADA", label: "Estimar automaticamente" },
          { value: "INFORMADA", label: "Informar manualmente" },
        ],
      },
      {
        key: "widthMeters",
        label: "Largura m?dia (m)",
        kind: "number",
        min: 0,
        max: 100,
        helper: "Use a largura manual quando ela for conhecida em campo ou em projeto executivo.",
      },
      {
        key: "laneCount",
        label: "N?mero de faixas",
        kind: "number",
        min: 1,
        max: 12,
      },
      {
        key: "surfaceCondition",
        label: "Condi??o do pavimento",
        kind: "select",
        required: true,
        options: [
          { value: "BOA", label: "Boa" },
          { value: "REGULAR", label: "Regular" },
          { value: "RUIM", label: "Ruim" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        required: true,
        options: [
          { value: "LIBERADO", label: "Liberado" },
          { value: "MEIA_PISTA", label: "Meia pista" },
          { value: "EM_OBRA", label: "Em obra" },
          { value: "BLOQUEADO", label: "Bloqueado" },
        ],
      },
      {
        key: "estimatedUnitCostSqm",
        label: "Custo estimado (R$/m?)",
        kind: "number",
        min: 0,
        max: 5000,
        helper: "Se ficar vazio, o sistema usa uma refer?ncia autom?tica pelo revestimento e tipo de interven??o.",
      },
      {
        key: "criticality",
        label: "Criticidade",
        kind: "select",
        required: true,
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "Cr?tica" },
        ],
      },
    ],
  },
  FRENTE_SERVICO_PAVIMENTO: {
    id: "FRENTE_SERVICO_PAVIMENTO",
    area: "PAVIMENTACAO",
    label: "Frente de servi?o",
    helper: "?rea operacional de execu??o da pavimenta??o",
    geometry: "polygon",
    fields: [
      {
        key: "serviceStage",
        label: "Etapa da frente",
        kind: "select",
        required: true,
        options: [
          { value: "FRESAGEM", label: "Fresagem" },
          { value: "BASE", label: "Base / sub-base" },
          { value: "IMPRIMACAO", label: "Imprima??o" },
          { value: "REVESTIMENTO", label: "Revestimento" },
          { value: "ACABAMENTO", label: "Acabamento" },
        ],
      },
      {
        key: "crewStatus",
        label: "Status da equipe",
        kind: "select",
        options: [
          { value: "MOBILIZADA", label: "Mobilizada" },
          { value: "ATUANDO", label: "Atuando" },
          { value: "PARALISADA", label: "Paralisada" },
          { value: "FINALIZADA", label: "Finalizada" },
        ],
      },
    ],
  },
  PONTO_FISCALIZACAO: {
    id: "PONTO_FISCALIZACAO",
    area: "FISCALIZACAO",
    label: "Ponto de fiscalizaÃ§Ã£o",
    helper: "Registro pontual de inspeÃ§Ã£o",
    geometry: "point",
    fields: [
      {
        key: "occurrenceType",
        label: "OcorrÃªncia",
        kind: "select",
        options: [
          { value: "ROTINA", label: "Rotina" },
          { value: "MEDICAO", label: "MediÃ§Ã£o" },
          { value: "NOTIFICACAO", label: "NotificaÃ§Ã£o" },
        ],
      },
    ],
  },
  AREA_FISCALIZADA: {
    id: "AREA_FISCALIZADA",
    area: "FISCALIZACAO",
    label: "Ãrea fiscalizada",
    helper: "PolÃ­gono de interdiÃ§Ã£o ou vistoria",
    geometry: "polygon",
  },
  EQUIPAMENTO_OBRA: {
    id: "EQUIPAMENTO_OBRA",
    area: "OBRAS",
    label: "Equipamento de obra",
    helper: "Canteiro, mÃ¡quina ou apoio",
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
    helper: "Ãrea principal de execuÃ§Ã£o",
    geometry: "polygon",
    fields: [
      {
        key: "workStage",
        label: "Etapa da frente",
        kind: "select",
        options: [
          { value: "MOBILIZACAO", label: "MobilizaÃ§Ã£o" },
          { value: "EXECUCAO", label: "ExecuÃ§Ã£o" },
          { value: "ACABAMENTO", label: "Acabamento" },
          { value: "ENTREGA", label: "Entrega" },
        ],
      },
    ],
  },
  EDIFICACAO_PUBLICA: {
    id: "EDIFICACAO_PUBLICA",
    area: "EDIFICACOES",
    label: "EdificaÃ§Ã£o pÃºblica",
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
    description: "Rede pluvial, dispositivos de captaÃ§Ã£o, pontos crÃ­ticos e manutenÃ§Ã£o operacional.",
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
        key: "flowDirection",
        label: "Sentido do escoamento",
        kind: "select",
        options: [
          { value: "MONTANTE_JUSANTE", label: "Montante -> jusante" },
          { value: "JUSANTE_MONTANTE", label: "Jusante -> montante" },
          { value: "NAO_IDENTIFICADO", label: "NÃ£o identificado" },
        ],
      },
      {
        key: "hydraulicCondition",
        label: "SituaÃ§Ã£o hidrÃ¡ulica",
        kind: "select",
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "ASSOREADA", label: "Assoreada" },
          { value: "OBSTRUIDA", label: "ObstruÃ­da" },
          { value: "MANUTENCAO", label: "Em manutenÃ§Ã£o" },
        ],
      },
    ],
    objectTypes: [
      "TRECHO_DRENAGEM",
      "BOCA_LOBO",
      "POCO_VISITA",
      "CAIXA_LIGACAO",
      "GALERIA_PLUVIAL",
      "SARJETA",
      "CANAL",
      "DISSIPADOR",
      "PONTO_ALAGAMENTO",
      "OCORRENCIA_DRENAGEM",
    ],
  },
  PAVIMENTACAO: {
    id: "PAVIMENTACAO",
    label: DISCIPLINE_LABELS.PAVIMENTACAO,
    description: "Trechos vi?rios, recupera??o funcional, patologias e frentes executivas.",
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
          { value: "PARALELEPIPEDO", label: "Paralelep?pedo" },
        ],
      },
      {
        key: "interventionPriority",
        label: "Prioridade",
        kind: "select",
        options: [
          { value: "BAIXA", label: "Baixa" },
          { value: "MEDIA", label: "M?dia" },
          { value: "ALTA", label: "Alta" },
          { value: "URGENTE", label: "Urgente" },
        ],
      },
    ],
    objectTypes: [
      "TRECHO_PAVIMENTO",
      "REMENDO_PAVIMENTO",
      "RECAPE_PAVIMENTO",
      "DEFEITO_PAVIMENTO",
      "BURACO",
      "AFUNDAMENTO_VIARIO",
      "BASE_SUBBASE",
      "FRENTE_SERVICO_PAVIMENTO",
    ],
  },
  ILUMINACAO: {
    id: "ILUMINACAO",
    label: DISCIPLINE_LABELS.ILUMINACAO,
    description: "Postes, pontos de ilumina??o, circuitos e gest?o operacional da ilumina??o p?blica.",
    accentClassName: "border-yellow-200 bg-yellow-50 text-yellow-700",
    commonFields: [
      {
        key: "powerCircuit",
        label: "Circuito",
        kind: "text",
        placeholder: "Ex.: CIR-12",
      },
      {
        key: "lightingLifecycle",
        label: "Ciclo do item",
        kind: "select",
        options: [
          { value: "ATIVO", label: "Ativo" },
          { value: "AMPLIACAO", label: "Amplia??o" },
          { value: "SUBSTITUICAO", label: "Substitui??o" },
          { value: "DESATIVACAO", label: "Desativa??o" },
        ],
      },
      {
        key: "operationalStatus",
        label: "Status operacional",
        kind: "select",
        options: [
          { value: "OPERANTE", label: "Operante" },
          { value: "ATENCAO", label: "Em aten??o" },
          { value: "EM_MANUTENCAO", label: "Em manuten??o" },
          { value: "DESATIVADO", label: "Desativado" },
        ],
      },
    ],
    objectTypes: [
      "POSTE_LUZ",
      "LUMINARIA",
      "CIRCUITO_ILUMINACAO",
      "PONTO_APAGADO",
      "OCORRENCIA_MANUTENCAO_ILUMINACAO",
      "ITEM_VISTORIADO_ILUMINACAO",
    ],
  },
  ARBORIZACAO: {
    id: "ARBORIZACAO",
    label: DISCIPLINE_LABELS.ARBORIZACAO,
    description: "Patrimônio arbóreo, áreas verdes e ocorrências de manejo urbano.",
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
      {
        key: "riskLevel",
        label: "Risco",
        kind: "select",
        options: [
          { value: "BAIXO", label: "Baixo" },
          { value: "MEDIO", label: "Médio" },
          { value: "ALTO", label: "Alto" },
          { value: "CRITICO", label: "Crítico" },
        ],
      },
    ],
    objectTypes: [
      "ARVORE",
      "AGRUPAMENTO_ARBOREO",
      "CANTEIRO_ARBORIZACAO",
      "AREA_VERDE",
      "OCORRENCIA_PODA",
      "SUPRESSAO_ARBORIZACAO",
      "RISCO_QUEDA_ARBORIZACAO",
      "CONFLITO_REDE_ARBORIZACAO"
    ],
  },
  SINALIZACAO: {
    id: "SINALIZACAO",
    label: DISCIPLINE_LABELS.SINALIZACAO,
    description: "SinalizaÃ§Ã£o vertical, horizontal e semafÃ³rica.",
    accentClassName: "border-rose-200 bg-rose-50 text-rose-700",
    commonFields: [
      {
        key: "signCode",
        label: "CÃ³digo tÃ©cnico",
        kind: "text",
        placeholder: "Ex.: R-1, A-2b, FAIXA-01...",
      },
      {
        key: "operationCondition",
        label: "CondiÃ§Ã£o operacional",
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
          { value: "MEDIA", label: "MÃ©dia" },
          { value: "ALTA", label: "Alta" },
          { value: "CRITICA", label: "CrÃ­tica" },
        ],
      },
      {
        key: "correctionDeadline",
        label: "Prazo de correÃ§Ã£o",
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
        label: "SituaÃ§Ã£o operacional",
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
    description: "Ativos de Ã¡gua, esgoto e apoio hidrÃ¡ulico.",
    accentClassName: "border-blue-200 bg-blue-50 text-blue-700",
    commonFields: [
      {
        key: "networkType",
        label: "Rede associada",
        kind: "select",
        options: [
          { value: "AGUA", label: "Ãgua" },
          { value: "ESGOTO", label: "Esgoto" },
          { value: "INCENDIO", label: "IncÃªndio" },
        ],
      },
    ],
    objectTypes: ["HIDRANTE"],
  },
  EDIFICACOES: {
    id: "EDIFICACOES",
    label: DISCIPLINE_LABELS.EDIFICACOES,
    description: "Equipamentos pÃºblicos e perÃ­metros edificados.",
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
    description: "Equipamentos de apoio urbano e manutenÃ§Ã£o cotidiana.",
    accentClassName: "border-zinc-200 bg-zinc-100 text-zinc-700",
    commonFields: [
      {
        key: "maintenanceStatus",
        label: "SituaÃ§Ã£o",
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
      errors.push(`${field.label} Ã© obrigatÃ³rio.`);
      continue;
    }

    if (!trimmed.length) continue;

    if (field.kind === "number") {
      const parsed = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(parsed)) {
        errors.push(`${field.label} deve ser numÃ©rico.`);
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
    throw new Error("Ãrea tÃ©cnica invÃ¡lida.");
  }

  if (
    nextAttributes.technicalObjectType !== undefined &&
    typeof nextAttributes.technicalObjectType === "string" &&
    !isTechnicalObjectType(nextAttributes.technicalObjectType)
  ) {
    throw new Error("Tipo de objeto tÃ©cnico invÃ¡lido.");
  }

  if (technicalObjectType) {
    const objectDefinition = getTechnicalObjectDefinition(technicalObjectType);
    if (
      technicalArea &&
      objectDefinition &&
      objectDefinition.area !== technicalArea
    ) {
      throw new Error("O tipo de objeto nÃ£o pertence Ã  Ã¡rea tÃ©cnica informada.");
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



