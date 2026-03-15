"use client";

import { ProjectBadge } from "@/components/projetos/project-detail-components";
import type { InfrastructureLayerFeatureRecord } from "@/lib/infrastructure-layer-map";

type LightingOperationalAction =
  | "POSTE_LUZ"
  | "LUMINARIA"
  | "PONTO_APAGADO"
  | "OCORRENCIA_MANUTENCAO_ILUMINACAO"
  | "ITEM_VISTORIADO_ILUMINACAO";

type ProjectLightingInfrastructureInspectorProps = {
  item: InfrastructureLayerFeatureRecord & {
    linkedOperationalCount: number;
  };
  onCreateOperationalItem: (action: LightingOperationalAction) => void;
  onClose: () => void;
};

export function ProjectLightingInfrastructureInspector({
  item,
  onCreateOperationalItem,
  onClose,
}: ProjectLightingInfrastructureInspectorProps) {
  const actionOptions: Array<{ id: LightingOperationalAction; label: string }> =
    item.layerType === "PONNOT"
      ? [
          { id: "POSTE_LUZ", label: "Criar poste operacional" },
          { id: "OCORRENCIA_MANUTENCAO_ILUMINACAO", label: "Registrar manutenção" },
          { id: "ITEM_VISTORIADO_ILUMINACAO", label: "Registrar vistoria" },
        ]
      : [
          { id: "LUMINARIA", label: "Criar ponto operacional" },
          { id: "PONTO_APAGADO", label: "Registrar ponto apagado" },
          { id: "OCORRENCIA_MANUTENCAO_ILUMINACAO", label: "Registrar manutenção" },
          { id: "ITEM_VISTORIADO_ILUMINACAO", label: "Registrar vistoria" },
        ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <ProjectBadge label={item.layerType} tone="brand" />
        <ProjectBadge
          label={item.linkedOperationalCount > 0 ? "Vinculado ao projeto" : "Sem vínculo operacional"}
          tone={item.linkedOperationalCount > 0 ? "success" : "warning"}
        />
        {item.operationalStatus ? <ProjectBadge label={item.operationalStatus} tone="neutral" /> : null}
      </div>

      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Ficha contextual importada
        </p>
        <p className="mt-3 whitespace-pre-line text-sm font-semibold text-foreground">
          {item.visibleLabel}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Município</dt>
            <dd className="text-right font-medium text-foreground">
              {[item.municipalityName, item.municipalityState].filter(Boolean).join(" · ") ||
                "Não informado"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Logradouro</dt>
            <dd className="text-right font-medium text-foreground">
              {item.streetName || "Não informado"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Bairro / região</dt>
            <dd className="text-right font-medium text-foreground">
              {[item.neighborhood, item.region].filter(Boolean).join(" · ") || "Não informado"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Circuito</dt>
            <dd className="text-right font-medium text-foreground">
              {item.circuit || "Não informado"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Condição</dt>
            <dd className="text-right font-medium text-foreground">
              {item.condition || "Não informada"}
            </dd>
          </div>
          {item.layerType === "PONNOT" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">QTD_UCS</dt>
              <dd className="text-right font-medium text-foreground">
                {item.qtdUcs ?? 0}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Ações operacionais
        </p>
        <div className="mt-3 grid gap-2">
          {actionOptions.map((action) => (
            <button
              key={action.id}
              onClick={() => onCreateOperationalItem(action.id)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
      >
        Fechar ficha importada
      </button>
    </div>
  );
}
