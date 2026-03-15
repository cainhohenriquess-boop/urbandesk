"use client";

import { ProjectBadge } from "@/components/projetos/project-detail-components";
import type { InfrastructureLayerFeatureRecord } from "@/lib/infrastructure-layer-map";
import { cn, formatNumber } from "@/lib/utils";

type LightingProjectLinkFilter = "ALL" | "LINKED" | "UNLINKED";

type ProjectLightingImportedPanelProps = {
  items: Array<
    InfrastructureLayerFeatureRecord & {
      linkedOperationalCount: number;
    }
  >;
  selectedSelectionKey: string | null;
  projectLinkFilter: LightingProjectLinkFilter;
  onProjectLinkFilterChange: (value: LightingProjectLinkFilter) => void;
  onSelect: (item: InfrastructureLayerFeatureRecord) => void;
};

export function ProjectLightingImportedPanel({
  items,
  selectedSelectionKey,
  projectLinkFilter,
  onProjectLinkFilterChange,
  onSelect,
}: ProjectLightingImportedPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "ALL", label: "Todos" },
            { value: "LINKED", label: "Vinculados ao projeto" },
            { value: "UNLINKED", label: "Sem vínculo" },
          ] as Array<{ value: LightingProjectLinkFilter; label: string }>
        ).map((option) => (
          <button
            key={option.value}
            onClick={() => onProjectLinkFilterChange(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              projectLinkFilter === option.value
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-background px-4 py-3">
        <p className="text-sm font-semibold text-foreground">
          {formatNumber(items.length)} item(ns) importado(s) no filtro
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Selecione um poste ou ponto de iluminação para abrir a ficha contextual e registrar
          ações operacionais do projeto.
        </p>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.slice(0, 24).map((item) => (
            <button
              key={item.selectionKey}
              onClick={() => onSelect(item)}
              className={cn(
                "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                selectedSelectionKey === item.selectionKey
                  ? "border-brand-500 bg-brand-50"
                  : "border-border bg-background hover:bg-muted/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.layerType === "PONNOT" ? item.codId || item.visibleLabel : item.txtLum || item.visibleLabel}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.layerType} · {item.streetName || item.municipalityName || "Sem logradouro"}
                  </p>
                </div>
                <ProjectBadge
                  label={item.linkedOperationalCount > 0 ? "Com vínculo" : "Base livre"}
                  tone={item.linkedOperationalCount > 0 ? "success" : "neutral"}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.operationalStatus ? (
                  <ProjectBadge label={item.operationalStatus} tone="neutral" />
                ) : null}
                {item.condition ? <ProjectBadge label={item.condition} tone="warning" /> : null}
                {item.circuit ? <ProjectBadge label={`Circuito ${item.circuit}`} tone="brand" /> : null}
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Nenhum item importado encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {items.length > 24 ? (
        <p className="text-xs text-muted-foreground">
          Exibindo os 24 primeiros itens. Refine a busca para localizar mais rápido.
        </p>
      ) : null}
    </div>
  );
}
