import {
  getDisciplineObjectTypes,
  getProjectDisciplineDefinition,
  type ProjectDisciplineId,
  type TechnicalGeometryKind,
  type TechnicalObjectDefinition,
  type TechnicalObjectTypeId,
} from "@/lib/project-disciplines";

export type SharedGeometryToolId = "line" | "polygon";

export type SharedGeometryToolDefinition = {
  id: SharedGeometryToolId;
  label: string;
  helper: string;
};

export type AreaToolsetGroupDefinition = {
  id: string;
  title: string;
  description: string;
  items: TechnicalObjectTypeId[];
};

export type AreaToolsetItemDefinition = TechnicalObjectDefinition & {
  groupId: string;
  groupTitle: string;
};

export const PROJECT_SHARED_DRAWING_TOOLS: SharedGeometryToolDefinition[] = [
  { id: "line", label: "Trecho livre", helper: "Desenho linear comum" },
  { id: "polygon", label: "Ãrea livre", helper: "PolÃ­gono comum" },
];

const DEFAULT_GROUP_BY_GEOMETRY: Record<TechnicalGeometryKind, AreaToolsetGroupDefinition> = {
  point: {
    id: "point-assets",
    title: "LanÃ§amentos pontuais",
    description: "Objetos tÃ©cnicos pontuais da disciplina.",
    items: [],
  },
  line: {
    id: "linear-assets",
    title: "Trechos e redes",
    description: "Ferramentas lineares e redes tÃ©cnicas.",
    items: [],
  },
  polygon: {
    id: "polygon-assets",
    title: "Ãreas tÃ©cnicas",
    description: "PolÃ­gonos, perÃ­metros e frentes espaciais.",
    items: [],
  },
};

const PROJECT_AREA_TOOLSET_GROUPS: Partial<
  Record<ProjectDisciplineId, AreaToolsetGroupDefinition[]>
> = {
  DRENAGEM: [
    {
      id: "drainage-network",
      title: "Rede e conduÃ§Ã£o",
      description: "Trechos lineares e estruturas principais da drenagem.",
      items: ["TRECHO_DRENAGEM", "GALERIA_PLUVIAL", "SARJETA", "CANAL"],
    },
    {
      id: "drainage-nodes",
      title: "CaptaÃ§Ã£o e inspeÃ§Ã£o",
      description: "Dispositivos pontuais de coleta, acesso e interligaÃ§Ã£o.",
      items: ["BOCA_LOBO", "POCO_VISITA", "CAIXA_LIGACAO", "DISSIPADOR"],
    },
    {
      id: "drainage-events",
      title: "Pontos crÃ­ticos e ocorrÃªncias",
      description: "Alagamentos e registros operacionais de manutenÃ§Ã£o.",
      items: ["PONTO_ALAGAMENTO", "OCORRENCIA_DRENAGEM"],
    },
  ],
  PAVIMENTACAO: [
    {
      id: "pavement-network",
      title: "Malha e interven??es lineares",
      description: "Trechos vi?rios e continuidade da interven??o no projeto.",
      items: ["TRECHO_PAVIMENTO"],
    },
    {
      id: "pavement-surfaces",
      title: "Recupera??o de superf?cie",
      description: "Remendos e recapes em ?reas localizadas ou cont?nuas.",
      items: ["REMENDO_PAVIMENTO", "RECAPE_PAVIMENTO"],
    },
    {
      id: "pavement-defects",
      title: "Patologias e ocorr?ncias",
      description: "Ocorr?ncias pontuais do revestimento e anomalias do leito vi?rio.",
      items: ["DEFEITO_PAVIMENTO", "BURACO", "AFUNDAMENTO_VIARIO"],
    },
    {
      id: "pavement-execution",
      title: "Base e execu??o",
      description: "Camadas estruturais e frentes de servi?o da pavimenta??o.",
      items: ["BASE_SUBBASE", "FRENTE_SERVICO_PAVIMENTO"],
    },
  ],
  ILUMINACAO: [
    {
      id: "lighting-reference",
      title: "Base e refer?ncia",
      description: "Postes e pontos operacionais apoiados nas camadas PONNOT e PONT_ILUM.",
      items: ["POSTE_LUZ", "LUMINARIA"],
    },
    {
      id: "lighting-network",
      title: "Circuitos e rede",
      description: "Circuitos, eixos de atendimento e continuidade da ilumina??o p?blica.",
      items: ["CIRCUITO_ILUMINACAO"],
    },
    {
      id: "lighting-operations",
      title: "Opera??o e vistoria",
      description: "Pontos apagados, manuten??o e itens vistoriados do projeto.",
      items: [
        "PONTO_APAGADO",
        "OCORRENCIA_MANUTENCAO_ILUMINACAO",
        "ITEM_VISTORIADO_ILUMINACAO",
      ],
    },
  ],
  ARBORIZACAO: [
    {
      id: "tree-assets",
      title: "Patrimônio arbóreo",
      description: "Árvores isoladas e agrupamentos arbóreos vinculados ao projeto.",
      items: ["ARVORE", "AGRUPAMENTO_ARBOREO"],
    },
    {
      id: "green-areas",
      title: "Canteiros e áreas verdes",
      description: "Canteiros implantados, áreas verdes e espaços vegetados do projeto.",
      items: ["CANTEIRO_ARBORIZACAO", "AREA_VERDE"],
    },
    {
      id: "tree-operations",
      title: "Manejo e ocorrências",
      description: "Poda, supressão, risco de queda e conflito com rede.",
      items: [
        "OCORRENCIA_PODA",
        "SUPRESSAO_ARBORIZACAO",
        "RISCO_QUEDA_ARBORIZACAO",
        "CONFLITO_REDE_ARBORIZACAO"
      ],
    },
  ],
  SINALIZACAO: [
    {
      id: "signaling-points",
      title: "SinalizaÃ§Ã£o pontual",
      description: "SemÃ¡foros, placas e dispositivos fÃ­sicos.",
      items: ["SEMAFORO", "PLACA_TRANSITO", "LOMBADA"],
    },
    {
      id: "signaling-lines",
      title: "SinalizaÃ§Ã£o linear",
      description: "Pintura viÃ¡ria e faixas horizontais.",
      items: ["PINTURA_VIARIA"],
    },
  ],
  FISCALIZACAO: [
    {
      id: "inspection-points",
      title: "Pontos de vistoria",
      description: "Registros pontuais de fiscalizaÃ§Ã£o.",
      items: ["PONTO_FISCALIZACAO"],
    },
    {
      id: "inspection-zones",
      title: "Zonas fiscalizadas",
      description: "PerÃ­metros de vistoria, interdiÃ§Ã£o ou controle.",
      items: ["AREA_FISCALIZADA"],
    },
  ],
  MOBILIDADE: [
    {
      id: "mobility-assets",
      title: "Equipamentos de mobilidade",
      description: "Pontos de Ã´nibus, radares e apoio operacional.",
      items: ["PONTO_ONIBUS", "RADAR"],
    },
  ],
  SANEAMENTO: [
    {
      id: "sanitation-assets",
      title: "Ativos hidrÃ¡ulicos",
      description: "Pontos de apoio e rede associada.",
      items: ["HIDRANTE"],
    },
  ],
  EDIFICACOES: [
    {
      id: "buildings",
      title: "PerÃ­metros edificados",
      description: "Ãreas de equipamentos e edificaÃ§Ãµes pÃºblicas.",
      items: ["EDIFICACAO_PUBLICA"],
    },
  ],
  ZELADORIA: [
    {
      id: "urban-support",
      title: "Equipamentos urbanos",
      description: "Elementos de apoio e manutenÃ§Ã£o cotidiana.",
      items: ["LIXEIRA"],
    },
  ],
  OBRAS: [
    {
      id: "construction-support",
      title: "Apoio de obra",
      description: "Equipamentos, canteiro e apoio operacional.",
      items: ["EQUIPAMENTO_OBRA"],
    },
    {
      id: "construction-fronts",
      title: "Frentes executivas",
      description: "PerÃ­metros e frentes espaciais de execuÃ§Ã£o.",
      items: ["FRENTE_OBRA"],
    },
  ],
};

export function getProjectAreaToolsetGroups(discipline: ProjectDisciplineId) {
  const explicitGroups = PROJECT_AREA_TOOLSET_GROUPS[discipline];
  if (explicitGroups && explicitGroups.length > 0) {
    return explicitGroups;
  }

  const objects = getDisciplineObjectTypes(discipline);
  const grouped = new Map<string, AreaToolsetGroupDefinition>();

  for (const object of objects) {
    const base = DEFAULT_GROUP_BY_GEOMETRY[object.geometry];
    const current =
      grouped.get(base.id) ??
      ({
        ...base,
        items: [],
      } satisfies AreaToolsetGroupDefinition);
    current.items.push(object.id);
    grouped.set(base.id, current);
  }

  return Array.from(grouped.values());
}

export function getAreaToolsetItems(discipline: ProjectDisciplineId) {
  const groups = getProjectAreaToolsetGroups(discipline);
  const definitions = new Map(
    getDisciplineObjectTypes(discipline).map((definition) => [definition.id, definition])
  );

  return groups.flatMap((group) =>
    group.items
      .map((id) => {
        const definition = definitions.get(id);
        if (!definition) return null;
        return {
          ...definition,
          groupId: group.id,
          groupTitle: group.title,
        } satisfies AreaToolsetItemDefinition;
      })
      .filter((item): item is AreaToolsetItemDefinition => item !== null)
  );
}

export function getAreaToolsetSummary(discipline: ProjectDisciplineId) {
  return getProjectDisciplineDefinition(discipline).description;
}

