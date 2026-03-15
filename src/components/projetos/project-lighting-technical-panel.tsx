"use client";

import { ProjectBadge } from "@/components/projetos/project-detail-components";
import type { LightingTechnicalPanelStats } from "@/lib/lighting-discipline";
import { formatNumber } from "@/lib/utils";

type ProjectLightingTechnicalPanelProps = {
  stats: LightingTechnicalPanelStats;
  hasPonnotLayer: boolean;
  hasPontIlumLayer: boolean;
};

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

export function ProjectLightingTechnicalPanel({
  stats,
  hasPonnotLayer,
  hasPontIlumLayer,
}: ProjectLightingTechnicalPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ProjectBadge
          label={hasPonnotLayer ? "PONNOT disponível" : "PONNOT indisponível"}
          tone={hasPonnotLayer ? "success" : "warning"}
        />
        <ProjectBadge
          label={hasPontIlumLayer ? "PONT_ILUM disponível" : "PONT_ILUM indisponível"}
          tone={hasPontIlumLayer ? "success" : "warning"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Postes importados"
          value={formatNumber(stats.importedPoles)}
          helper="Referências vindas da camada PONNOT."
        />
        <MetricCard
          label="Pontos importados"
          value={formatNumber(stats.importedLightingPoints)}
          helper="Base de iluminação pública de PONT_ILUM."
        />
        <MetricCard
          label="Postes operacionais"
          value={formatNumber(stats.operationalPosts)}
          helper="Objetos do projeto criados sobre a base importada."
        />
        <MetricCard
          label="Pontos operacionais"
          value={formatNumber(stats.operationalLightingPoints)}
          helper="Itens de iluminação cadastrados no workspace."
        />
        <MetricCard
          label="Pontos apagados"
          value={formatNumber(stats.operationalOutages)}
          helper="Registros operacionais de falha ou apagamento."
        />
        <MetricCard
          label="Manutenção"
          value={formatNumber(stats.operationalMaintenance)}
          helper="Ocorrências e chamados vinculados ao projeto."
        />
      </div>

      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Gestão operacional
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Itens vistoriados</dt>
            <dd className="font-medium text-foreground">
              {formatNumber(stats.operationalInspections)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Itens com vínculo elétrico</dt>
            <dd className="font-medium text-foreground">
              {formatNumber(stats.linkedOperationalItems)}
            </dd>
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

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">Importado x operacional</p>
        <p className="mt-2 text-sm text-muted-foreground">
          A disciplina de Iluminação usa <code>PONNOT</code> e <code>PONT_ILUM</code> como
          base de referência. Os itens criados no projeto permanecem como dados operacionais do
          sistema e guardam apenas o vínculo com essas camadas, sem duplicar a infraestrutura
          importada.
        </p>
      </div>
    </div>
  );
}
