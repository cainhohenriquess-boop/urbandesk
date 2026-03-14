export const INFRASTRUCTURE_LAYER_CODES = ["PONNOT", "PONT_ILUM"] as const;

export type InfrastructureLayerCodeId =
  (typeof INFRASTRUCTURE_LAYER_CODES)[number];

export type InfrastructureLayerNormalizedProperties = {
  layerCode: InfrastructureLayerCodeId;
  layerLabel: string;
  layerShortLabel: string;
  featureKind: string;
  label: string;
  labelShort: string;
  labelMultiline?: string | null;
  TXT_LUM?: string | null;
  name: string;
  NOME: string;
  identifier: string | null;
  code: string | null;
  codigo: string | null;
  CODIGO: string | null;
  COD_ID?: string | null;
  ESTR?: string | null;
  ALT?: string | null;
  ESF?: string | null;
  QTD_UCS?: number;
  ALT_DECODIFICADO?: string | null;
  ESF_DECODIFICADO?: string | null;
  ownerTenantId: string | null;
  municipalityName: string | null;
  municipalityCode: string | null;
  municipalityState: string | null;
  streetName: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  feeder: string | null;
  circuit: string | null;
  supportType: string | null;
  operationalStatus: string | null;
  lampType: string | null;
  powerWatts: number | null;
  reference: string | null;
  renderColor: string;
  renderIcon: string;
  searchText: string;
};

type InfrastructureLayerFieldMapping = {
  label: string[];
  identifier: string[];
  municipalityName: string[];
  municipalityCode: string[];
  streetName: string[];
  neighborhood: string[];
  district: string[];
  region: string[];
  feeder: string[];
  circuit: string[];
  supportType: string[];
  operationalStatus: string[];
  lampType: string[];
  powerWatts: string[];
  reference: string[];
};

export type InfrastructureLayerSpec = {
  label: string;
  shortLabel: string;
  description: string;
  featureKind: string;
  defaultLabelPrefix: string;
  defaultIdentifierPrefix: string;
  renderColor: string;
  renderIcon: string;
  fields: InfrastructureLayerFieldMapping;
};

export const INFRASTRUCTURE_LAYER_LABELS: Record<
  InfrastructureLayerCodeId,
  string
> = {
  PONNOT: "PONNOT · Postes e pontos de referência",
  PONT_ILUM: "PONT_ILUM · Pontos de iluminação pública",
};

export const INFRASTRUCTURE_LAYER_SHORT_LABELS: Record<
  InfrastructureLayerCodeId,
  string
> = {
  PONNOT: "Postes / referência",
  PONT_ILUM: "Iluminação pública",
};

export const INFRASTRUCTURE_LAYER_DESCRIPTIONS: Record<
  InfrastructureLayerCodeId,
  string
> = {
  PONNOT:
    "Camada operacional de postes e pontos de apoio da infraestrutura elétrica.",
  PONT_ILUM:
    "Camada temática de pontos de iluminação pública autorizados para o município.",
};

export const INFRASTRUCTURE_LAYER_SPECS: Record<
  InfrastructureLayerCodeId,
  InfrastructureLayerSpec
> = {
  PONNOT: {
    label: INFRASTRUCTURE_LAYER_LABELS.PONNOT,
    shortLabel: INFRASTRUCTURE_LAYER_SHORT_LABELS.PONNOT,
    description: INFRASTRUCTURE_LAYER_DESCRIPTIONS.PONNOT,
    featureKind: "electric_pole_reference",
    defaultLabelPrefix: "Poste",
    defaultIdentifierPrefix: "PON",
    renderColor: "#0f766e",
    renderIcon: "P",
    fields: {
      label: [
        "NOME",
        "NOMEPONTO",
        "NOMEPOSTE",
        "DESCRICAO",
        "DESCR",
        "ROTULO",
        "LABEL",
      ],
      identifier: [
        "COD_ID",
        "CODIGO",
        "COD",
        "ID",
        "IDPOSTE",
        "NUMERO",
        "NUM",
        "POSTE",
        "PONNOT",
      ],
      municipalityName: [
        "MUNICIPIO",
        "MUNICÍPIO",
        "NOMEMUN",
        "MUNNOME",
        "CIDADE",
      ],
      municipalityCode: ["CODMUN", "IBGE", "CD_MUN", "MUNICOD", "CODIGOIBGE"],
      streetName: ["LOGRADOURO", "RUA", "NOMELOG", "VIA", "ENDERECO", "ENDEREÇO"],
      neighborhood: ["BAIRRO", "NM_BAIRRO", "SETOR", "SETORURB"],
      district: ["DISTRITO", "DT_DISTR"],
      region: ["REGIAO", "REGIÃO", "ZONA", "SETORADM"],
      feeder: ["ALIMENTADOR", "ALIM", "FEEDER"],
      circuit: ["CIRCUITO", "CIRC", "CIR", "REDE"],
      supportType: ["TIPOPOSTE", "TP_POSTE", "TIPO", "CLASSE"],
      operationalStatus: ["STATUS", "SITUACAO", "SITUAÇÃO", "OPERACAO", "OPERAÇÃO"],
      lampType: [],
      powerWatts: [],
      reference: ["REFERENCIA", "REFERÊNCIA", "PONTOREF", "OBS", "OBSERVACAO", "OBSERVAÇÃO"],
    },
  },
  PONT_ILUM: {
    label: INFRASTRUCTURE_LAYER_LABELS.PONT_ILUM,
    shortLabel: INFRASTRUCTURE_LAYER_SHORT_LABELS.PONT_ILUM,
    description: INFRASTRUCTURE_LAYER_DESCRIPTIONS.PONT_ILUM,
    featureKind: "public_lighting_point",
    defaultLabelPrefix: "Ponto de iluminação",
    defaultIdentifierPrefix: "ILUM",
    renderColor: "#ca8a04",
    renderIcon: "L",
    fields: {
      label: [
        "NOME",
        "NOMEPONTO",
        "DESCRICAO",
        "DESCR",
        "ROTULO",
        "LABEL",
        "IDENTIFIC",
      ],
      identifier: [
        "CODIGO",
        "COD",
        "ID",
        "IDILUM",
        "NUMERO",
        "NUM",
        "PONTILUM",
        "PONTO",
      ],
      municipalityName: [
        "MUNICIPIO",
        "MUNICÍPIO",
        "NOMEMUN",
        "MUNNOME",
        "CIDADE",
      ],
      municipalityCode: ["CODMUN", "IBGE", "CD_MUN", "MUNICOD", "CODIGOIBGE"],
      streetName: ["LOGRADOURO", "RUA", "NOMELOG", "VIA", "ENDERECO", "ENDEREÇO"],
      neighborhood: ["BAIRRO", "NM_BAIRRO", "SETOR", "SETORURB"],
      district: ["DISTRITO", "DT_DISTR"],
      region: ["REGIAO", "REGIÃO", "ZONA", "SETORADM"],
      feeder: ["ALIMENTADOR", "ALIM", "FEEDER"],
      circuit: ["CIRCUITO", "CIRC", "CIR", "REDE"],
      supportType: ["TIPOLUZ", "TIPOPOSTE", "TIPO", "SUPORTE"],
      operationalStatus: ["STATUS", "SITUACAO", "SITUAÇÃO", "OPERACAO", "OPERAÇÃO"],
      lampType: ["TIPOLAMP", "LAMPADA", "LÂMPADA", "LUMINARIA", "LUMINÁRIA", "TECNOLOGIA"],
      powerWatts: ["POTENCIA", "POTÊNCIA", "POTW", "WATTS"],
      reference: ["REFERENCIA", "REFERÊNCIA", "PONTOREF", "OBS", "OBSERVACAO", "OBSERVAÇÃO"],
    },
  },
};

export function isInfrastructureLayerCode(
  value: unknown
): value is InfrastructureLayerCodeId {
  return (
    typeof value === "string" &&
    (INFRASTRUCTURE_LAYER_CODES as readonly string[]).includes(value)
  );
}
