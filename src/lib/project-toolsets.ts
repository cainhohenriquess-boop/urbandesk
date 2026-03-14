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
      id: "lighting-assets",
      title: "Pontos de iluminação",
      description: "Postes, luminárias e apoio operacional.",
      items: ["POSTE_LUZ", "LUMINARIA"],
    },
  ],
  ARBORIZACAO: [
    {
      id: "trees",
      title: "Elementos arbóreos",
      description: "Árvores e canteiros de arborização.",
      items: ["ARVORE", "CANTEIRO_ARBORIZACAO"],
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
