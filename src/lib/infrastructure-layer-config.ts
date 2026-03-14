export const INFRASTRUCTURE_LAYER_CODES = ["PONNOT", "PONT_ILUM"] as const;

export type InfrastructureLayerCodeId =
  (typeof INFRASTRUCTURE_LAYER_CODES)[number];

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

export function isInfrastructureLayerCode(
  value: unknown
): value is InfrastructureLayerCodeId {
  return (
    typeof value === "string" &&
    (INFRASTRUCTURE_LAYER_CODES as readonly string[]).includes(value)
  );
}
