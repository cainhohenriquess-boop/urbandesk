"use client";

import { ProjectBadge, ProjectEmptyBlock } from "@/components/projetos/project-detail-components";
import {
  getLightingProjectLinkFilterLabel,
  type LightingProjectLinkFilter,
  type LightingPanelBreakdownItem,
  type LightingTechnicalPanelStats,
} from "@/lib/lighting-technical-panel";
import { cn, formatNumber } from "@/lib/utils";

type ProjectLightingTechnicalPanelProps = {
  stats: LightingTechnicalPanelStats;
  hasPonnotLayer: boolean;
  hasPontIlumLayer: boolean;
  projectLinkFilter: LightingProjectLinkFilter;
  onProjectLinkFilterChange: (value: LightingProjectLinkFilter) => void;
  activeOperationalStatus: string;
  onOperationalStatusChange: (value: string) => void;
  activeMunicipality: string;
  onMunicipalityChange: (value: string) => void;
  municipalityOptions: string[];
  statusOptions: string[];
};

function KpiCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
}) {
  return (
    <article className="rounded-2xl border border-border bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <ProjectBadge label={label} tone={tone} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </article>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: LightingPanelBreakdownItem[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <ProjectBadge label={`${formatNumber(items.length)} grupo(s)`} tone="neutral" />
      </div>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border border-border/80 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <ProjectBadge label={`${formatNumber(item.count)} item(ns)`} tone="brand" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <ProjectEmptyBlock
            title="Sem dados suficientes"
            description="Ligue as camadas publicadas e refine os filtros para consolidar esta visão." 
          />
        </div>
      )}
    </div>
  );
}

export function ProjectLightingTechnicalPanel({
  stats,
  hasPonnotLayer,
  hasPontIlumLayer,
  projectLinkFilter,
  onProjectLinkFilterChange,
  activeOperationalStatus,
  onOperationalStatusChange,
  activeMunicipality,
  onMunicipalityChange,
  municipalityOptions,
  statusOptions,
}: ProjectLightingTechnicalPanelProps) {
  const projectLinkOptions: Array<{ value: LightingProjectLinkFilter; label: string; count: number }> = [
    { value: "ALL", label: "Todos", count: stats.filteredImportedItems },
    { value: "LINKED", label: "Vinculados", count: stats.linkedImportedItems },
    { value: "UNLINKED", label: "Sem vínculo", count: stats.unlinkedImportedItems },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex flex-wrap gap-2">
          <ProjectBadge
            label={hasPonnotLayer ? "PONNOT disponível" : "PONNOT indisponível"}
            tone={hasPonnotLayer ? "success" : "warning"}
          />
          <ProjectBadge
            label={hasPontIlumLayer ? "PONT_ILUM disponível" : "PONT_ILUM indisponível"}
            tone={hasPontIlumLayer ? "success" : "warning"}
          />
          <ProjectBadge label={getLightingProjectLinkFilterLabel(projectLinkFilter)} tone="brand" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          Visão operacional da iluminação pública sobre a base importada
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          O painel consolida postes, pontos de iluminação e registros operacionais do projeto usando
          apenas as camadas autorizadas para o município da prefeitura autenticada.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Filtros operacionais
          </p>
          <ProjectBadge label={`${formatNumber(stats.filteredImportedItems)} item(ns) no recorte`} tone="neutral" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {projectLinkOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onProjectLinkFilterChange(option.value)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                projectLinkFilter === option.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-border bg-white text-foreground hover:bg-muted"
              )}
            >
              {option.label} · {formatNumber(option.count)}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.14em]">Status da base</span>
            <select
              value={activeOperationalStatus}
              onChange={(event) => onOperationalStatusChange(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500"
            >
              <option value="ALL">Todos os status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.14em]">Município</span>
            <select
              value={activeMunicipality}
              onChange={(event) => onMunicipalityChange(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500"
            >
              <option value="ALL">Todos os municípios</option>
              {municipalityOptions.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KpiCard
          label="Postes base"
          value={formatNumber(stats.importedPoles)}
          helper={`${formatNumber(stats.authorizedPoles)} autorizado(s) no município; ${formatNumber(stats.importedPoles)} no filtro atual.`}
          tone="brand"
        />
        <KpiCard
          label="Pontos de iluminação"
          value={formatNumber(stats.importedLightingPoints)}
          helper={`${formatNumber(stats.authorizedLightingPoints)} autorizado(s) no município; ${formatNumber(stats.importedLightingPoints)} no filtro atual.`}
          tone="success"
        />
        <KpiCard
          label="Ocorrências abertas"
          value={formatNumber(stats.openOccurrences)}
          helper="Pontos apagados ou falhas operacionais ainda não normalizados no projeto."
          tone={stats.openOccurrences > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Manutenções pendentes"
          value={formatNumber(stats.pendingMaintenance)}
          helper="Chamados ou manutenções de iluminação ainda não concluídos."
          tone={stats.pendingMaintenance > 0 ? "danger" : "success"}
        />
        <KpiCard
          label="Itens vinculados ao projeto"
          value={formatNumber(stats.linkedImportedItems)}
          helper="Base importada já utilizada por ocorrências, manutenção, vistoria ou cadastro operacional."
          tone="brand"
        />
        <KpiCard
          label="Itens no recorte"
          value={formatNumber(stats.filteredImportedItems)}
          helper={`${formatNumber(stats.totalImportedItems)} item(ns) autorizado(s) disponíveis antes dos filtros.`}
          tone="neutral"
        />
      </div>

      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Gestão operacional do projeto
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Postes operacionais</dt>
            <dd className="font-medium text-foreground">{formatNumber(stats.operationalPosts)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Pontos operacionais</dt>
            <dd className="font-medium text-foreground">{formatNumber(stats.operationalLightingPoints)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Registros de manutenção</dt>
            <dd className="font-medium text-foreground">{formatNumber(stats.operationalMaintenance)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Itens vistoriados</dt>
            <dd className="font-medium text-foreground">{formatNumber(stats.operationalInspections)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Itens com vínculo elétrico</dt>
            <dd className="font-medium text-foreground">{formatNumber(stats.linkedOperationalItems)}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Circuitos identificados</dt>
            <dd className="text-right font-medium text-foreground">
              {stats.circuits.length > 0
                ? stats.circuits.slice(0, 4).join(", ")
                : "Nenhum circuito disponível"}
            </dd>
          </div>
        </dl>
        {stats.circuits.length > 4 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            +{formatNumber(stats.circuits.length - 4)} circuito(s) adicional(is) identificado(s).
          </p>
        ) : null}
      </div>

      <BreakdownList title="Itens por município" items={stats.municipalities} />
      <BreakdownList title="Itens por bairro" items={stats.neighborhoods} />
      <BreakdownList title="Itens por status" items={stats.statuses} />
    </div>
  );
}
