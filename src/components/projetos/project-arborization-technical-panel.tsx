"use client";

import { ProjectBadge, ProjectEmptyBlock } from "@/components/projetos/project-detail-components";
import {
  type ArborizationBreakdownItem,
  type ArborizationTechnicalPanelStats,
} from "@/lib/arborization-technical-panel";
import { formatNumber } from "@/lib/utils";

type ProjectArborizationTechnicalPanelProps = {
  stats: ArborizationTechnicalPanelStats;
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
    <article className="rounded-2xl border border-border bg-background px-3 py-3">
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
  items: ArborizationBreakdownItem[];
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
            description="Cadastre elementos arbóreos e ocorrências para consolidar esta distribuição."
          />
        </div>
      )}
    </div>
  );
}

export function ProjectArborizationTechnicalPanel({
  stats,
}: ProjectArborizationTechnicalPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Painel técnico de arborização
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          Visão operacional do patrimônio arbóreo dentro do projeto
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          O painel resume árvores, áreas vegetadas, ocorrências de manejo e itens com risco para
          apoiar planejamento, fiscalização e execução no mapa.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KpiCard
          label="Árvores"
          value={formatNumber(stats.totalTrees)}
          helper={`${formatNumber(stats.arborizationItems)} item(ns) de arborização cadastrados no projeto.`}
          tone="brand"
        />
        <KpiCard
          label="Áreas vegetadas"
          value={formatNumber(stats.groupedAreas)}
          helper="Agrupamentos arbóreos, canteiros e áreas verdes mapeados."
          tone="success"
        />
        <KpiCard
          label="Ocorrências abertas"
          value={formatNumber(stats.openOccurrences)}
          helper="Podas, conflitos, riscos e demais registros ainda não concluídos."
          tone={stats.openOccurrences > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Supressões pendentes"
          value={formatNumber(stats.pendingSuppressions)}
          helper="Solicitações ou execuções de supressão ainda em andamento."
          tone={stats.pendingSuppressions > 0 ? "danger" : "neutral"}
        />
        <KpiCard
          label="Itens críticos"
          value={formatNumber(stats.criticalItems)}
          helper="Elementos em risco, com condição severa ou ocorrência crítica ativa."
          tone={stats.criticalItems > 0 ? "danger" : "success"}
        />
      </div>

      <BreakdownList title="Itens por espécie" items={stats.itemsBySpecies} />
      <BreakdownList title="Itens por porte" items={stats.itemsByCanopy} />
      <BreakdownList title="Itens por condição" items={stats.itemsByCondition} />
      <BreakdownList title="Itens por risco" items={stats.itemsByRisk} />
    </div>
  );
}
