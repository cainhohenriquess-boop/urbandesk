"use client";

import { ProjectBadge, ProjectEmptyBlock } from "@/components/projetos/project-detail-components";
import type {
  SignalingMobilityBreakdownItem,
  SignalingMobilityTechnicalPanelStats,
} from "@/lib/signaling-mobility-panel";
import { getProjectDisciplineLabel, type ProjectDisciplineId } from "@/lib/project-disciplines";
import { formatNumber } from "@/lib/utils";

type ProjectSignalingMobilityPanelProps = {
  area: ProjectDisciplineId;
  stats: SignalingMobilityTechnicalPanelStats;
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
  items: SignalingMobilityBreakdownItem[];
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
            description="Cadastre elementos desta disciplina para consolidar a distribuição técnica."
          />
        </div>
      )}
    </div>
  );
}

export function ProjectSignalingMobilityPanel({
  area,
  stats,
}: ProjectSignalingMobilityPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          Painel técnico de {getProjectDisciplineLabel(area).toLowerCase()}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          Visão operacional dos cadastros georreferenciados da disciplina
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          O painel resume quantidade de elementos, conformidade, condição operacional e
          distribuição por tipo para apoiar diagnóstico e execução no mapa.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KpiCard
          label="Total de itens"
          value={formatNumber(stats.totalItems)}
          helper="Cadastros da disciplina visíveis no recorte atual do projeto."
          tone="brand"
        />
        <KpiCard
          label="Pontos"
          value={formatNumber(stats.pointItems)}
          helper="Elementos pontuais como placas, semáforos, pontos de ônibus e dispositivos."
          tone="success"
        />
        <KpiCard
          label="Trechos"
          value={formatNumber(stats.linearItems)}
          helper="Faixas, travessias, ciclovias e marcações lineares cadastradas."
          tone="neutral"
        />
        <KpiCard
          label="Não conformes"
          value={formatNumber(stats.nonCompliantItems)}
          helper="Itens marcados como não conformes para correção ou adequação."
          tone={stats.nonCompliantItems > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Itens críticos"
          value={formatNumber(stats.criticalItems)}
          helper="Condição ruim, inoperante, apagada ou com não conformidade ativa."
          tone={stats.criticalItems > 0 ? "danger" : "success"}
        />
      </div>

      <BreakdownList title="Itens por tipo" items={stats.itemsByType} />
      <BreakdownList title="Itens por condição" items={stats.itemsByCondition} />
      <BreakdownList title="Itens por conformidade" items={stats.itemsByConformity} />
    </div>
  );
}
