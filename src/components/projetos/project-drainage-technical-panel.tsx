"use client";

import { ProjectBadge, ProjectEmptyBlock } from "@/components/projetos/project-detail-components";
import {
  getDrainageStatusFilterLabel,
  type DrainageTechnicalPanelStats,
} from "@/lib/drainage-technical-panel";
import { cn, formatDistance, formatNumber } from "@/lib/utils";

type ProjectDrainageTechnicalPanelProps = {
  stats: DrainageTechnicalPanelStats;
  activeOperationalStatus: string;
  onOperationalStatusChange: (value: string) => void;
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
  items: Array<{ key: string; label: string; count: number; lengthMeters: number }>;
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
                <ProjectBadge label={`${formatNumber(item.count)} trecho(s)`} tone="brand" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistance(item.lengthMeters)} acumulados
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <ProjectEmptyBlock
            title="Sem dados suficientes"
            description="Cadastre trechos com ficha técnica para consolidar esta distribuição."
          />
        </div>
      )}
    </div>
  );
}

export function ProjectDrainageTechnicalPanel({
  stats,
  activeOperationalStatus,
  onOperationalStatusChange,
}: ProjectDrainageTechnicalPanelProps) {
  const statusOptions = [
    { key: "ALL", label: "Todos", count: stats.totalSegments },
    ...stats.statusBreakdown.map((item) => ({
      key: item.key,
      label: item.label,
      count: item.count,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
          Painel técnico de drenagem
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          Visão operacional e gerencial da rede dentro do projeto
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          O painel resume trechos, pontos críticos e ocorrências e também controla o filtro do mapa por status operacional.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KpiCard
          label="Trechos"
          value={formatNumber(stats.totalSegments)}
          helper={`${formatNumber(stats.drainageItems)} item(ns) de drenagem carregados no projeto.`}
          tone="brand"
        />
        <KpiCard
          label="Extensão total"
          value={formatDistance(stats.totalLengthMeters)}
          helper="Soma da malha linear cadastrada no mapa."
          tone="success"
        />
        <KpiCard
          label="Pontos de alagamento"
          value={formatNumber(stats.floodingPoints)}
          helper="Ocorrências recorrentes de acúmulo de água."
          tone={stats.floodingPoints > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Ocorrências abertas"
          value={formatNumber(stats.openOccurrences)}
          helper="Registros operacionais ainda não concluídos."
          tone={stats.openOccurrences > 0 ? "danger" : "success"}
        />
        <KpiCard
          label="Itens críticos"
          value={formatNumber(stats.criticalItems)}
          helper="Trechos ou pontos com risco, criticidade ou condição severa."
          tone={stats.criticalItems > 0 ? "danger" : "success"}
        />
      </div>

      <div className="rounded-2xl border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Mapa filtrado por status
          </p>
          <ProjectBadge label={getDrainageStatusFilterLabel(activeOperationalStatus)} tone="brand" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status.key}
              onClick={() => onOperationalStatusChange(status.key)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                activeOperationalStatus === status.key
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-border bg-white text-foreground hover:bg-muted"
              )}
            >
              {status.label} · {formatNumber(status.count)}
            </button>
          ))}
        </div>
      </div>

      <BreakdownList title="Trechos por material" items={stats.segmentsByMaterial} />
      <BreakdownList title="Trechos por condição" items={stats.segmentsByCondition} />
    </div>
  );
}
