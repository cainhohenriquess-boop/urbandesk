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
  { id: "polygon", label: "Área livre", helper: "Polígono comum" },
];

const DEFAULT_GROUP_BY_GEOMETRY: Record<TechnicalGeometryKind, AreaToolsetGroupDefinition> = {
  point: {
    id: "point-assets",
    title: "Lançamentos pontuais",
    description: "Objetos técnicos pontuais da disciplina.",
    items: [],
  },
  line: {
    id: "linear-assets",
    title: "Trechos e redes",
    description: "Ferramentas lineares e redes técnicas.",
    items: [],
  },
  polygon: {
    id: "polygon-assets",
    title: "Áreas técnicas",
    description: "Polígonos, perímetros e frentes espaciais.",
    items: [],
  },
};

const PROJECT_AREA_TOOLSET_GROUPS: Partial<
  Record<ProjectDisciplineId, AreaToolsetGroupDefinition[]>
> = {
  DRENAGEM: [
    {
      id: "drainage-network",
      title: "Rede e condução",
      description: "Trechos lineares e estruturas principais da drenagem.",
      items: ["TRECHO_DRENAGEM", "GALERIA_PLUVIAL", "SARJETA", "CANAL"],
    },
    {
      id: "drainage-nodes",
      title: "Captação e inspeção",
      description: "Dispositivos pontuais de coleta, acesso e interligação.",
      items: ["BOCA_LOBO", "POCO_VISITA", "CAIXA_LIGACAO", "DISSIPADOR"],
    },
    {
      id: "drainage-events",
      title: "Pontos críticos e ocorrências",
      description: "Alagamentos e registros operacionais de manutenção.",
      items: ["PONTO_ALAGAMENTO", "OCORRENCIA_DRENAGEM"],
    },
  ],
  PAVIMENTACAO: [
    {
      id: "pavement-network",
      title: "Malha e intervenções lineares",
      description: "Trechos viários e continuidade da intervenção no projeto.",
      items: ["TRECHO_PAVIMENTO"],
    },
    {
      id: "pavement-surfaces",
      title: "Recuperação de superfície",
      description: "Remendos e recapes em áreas localizadas ou contínuas.",
      items: ["REMENDO_PAVIMENTO", "RECAPE_PAVIMENTO"],
    },
    {
      id: "pavement-defects",
      title: "Patologias e ocorrências",
      description: "Ocorrências pontuais do revestimento e anomalias do leito viário.",
      items: ["DEFEITO_PAVIMENTO", "BURACO", "AFUNDAMENTO_VIARIO"],
    },
    {
      id: "pavement-execution",
      title: "Base e execução",
      description: "Camadas estruturais e frentes de serviço da pavimentação.",
      items: ["BASE_SUBBASE", "FRENTE_SERVICO_PAVIMENTO"],
    },
  ],
  ILUMINACAO: [
    {
      id: "lighting-reference",
      title: "Base e referência",
      description: "Postes e pontos operacionais apoiados nas camadas PONNOT e PONT_ILUM.",
      items: ["POSTE_LUZ", "LUMINARIA"],
    },
    {
      id: "lighting-network",
      title: "Circuitos e rede",
      description: "Circuitos, eixos de atendimento e continuidade da iluminação pública.",
      items: ["CIRCUITO_ILUMINACAO"],
    },
    {
      id: "lighting-operations",
      title: "Operação e vistoria",
      description: "Pontos apagados, manutenção e itens vistoriados do projeto.",
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
        "CONFLITO_REDE_ARBORIZACAO",
      ],
    },
  ],
  SINALIZACAO: [
    {
      id: "signaling-points",
      title: "Sinalização pontual",
      description: "Semáforos, placas e dispositivos físicos.",
      items: ["SEMAFORO", "PLACA_TRANSITO", "LOMBADA"],
    },
    {
      id: "signaling-lines",
      title: "Sinalização linear",
      description: "Pintura viária e faixas horizontais.",
      items: ["PINTURA_VIARIA"],
    },
  ],
  FISCALIZACAO: [
    {
      id: "inspection-points",
      title: "Pontos de vistoria",
      description: "Registros pontuais de fiscalização.",
      items: ["PONTO_FISCALIZACAO"],
    },
    {
      id: "inspection-zones",
      title: "Zonas fiscalizadas",
      description: "Perímetros de vistoria, interdição ou controle.",
      items: ["AREA_FISCALIZADA"],
    },
  ],
  MOBILIDADE: [
    {
      id: "mobility-assets",
      title: "Equipamentos de mobilidade",
      description: "Pontos de ônibus, radares e apoio operacional.",
      items: ["PONTO_ONIBUS", "RADAR"],
    },
  ],
  SANEAMENTO: [
    {
      id: "sanitation-assets",
      title: "Ativos hidráulicos",
      description: "Pontos de apoio e rede associada.",
      items: ["HIDRANTE"],
    },
  ],
  EDIFICACOES: [
    {
      id: "buildings",
      title: "Perímetros edificados",
      description: "Áreas de equipamentos e edificações públicas.",
      items: ["EDIFICACAO_PUBLICA"],
    },
  ],
  ZELADORIA: [
    {
      id: "urban-support",
      title: "Equipamentos urbanos",
      description: "Elementos de apoio e manutenção cotidiana.",
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
      description: "Perímetros e frentes espaciais de execução.",
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
    if (!object) continue;
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
    getDisciplineObjectTypes(discipline)
      .filter((definition): definition is TechnicalObjectDefinition => Boolean(definition))
      .map((definition) => [definition.id, definition])
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
  return (
    getProjectDisciplineDefinition(discipline)?.description ??
    "Ferramentas técnicas organizadas por área."
  );
}
