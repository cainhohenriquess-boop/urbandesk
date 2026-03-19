"use client";

import { useMemo, useState } from "react";
import type { ProjectTechnicalArea } from "@prisma/client";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { formatHistoryEventSubtitle, type ProjectHistoryIndicators, type SerializedProjectHistoryEvent } from "@/lib/project-governance";
import { getProjectTechnicalAreaLabel } from "@/lib/project-labels";

type ProjectHistoryClientProps = {
  projectId: string;
  initialEvents: SerializedProjectHistoryEvent[];
  initialIndicators: ProjectHistoryIndicators;
  technicalAreas: ProjectTechnicalArea[];
};

export function ProjectHistoryClient({
  projectId,
  initialEvents,
  initialIndicators,
  technicalAreas,
}: ProjectHistoryClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [kindFilter, setKindFilter] = useState<"" | SerializedProjectHistoryEvent["kind"]>("");
  const [areaFilter, setAreaFilter] = useState<"" | ProjectTechnicalArea>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return events.filter((event) => {
      if (kindFilter && event.kind !== kindFilter) return false;
      if (areaFilter && event.area !== areaFilter) return false;
      if (!normalized) return true;
      return [event.title, event.detail, event.actorName, event.badge]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [areaFilter, events, kindFilter, search]);

  const refreshHistory = async () => {
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/history`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao recarregar o histórico.");
      }
      if (payload?.events) setEvents(payload.events);
      if (payload?.indicators) setIndicators(payload.indicators);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Falha ao recarregar o histórico.");
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Eventos"
          value={String(indicators.totalEvents)}
          helper="Linha do tempo consolidada do projeto."
        />
        <ProjectMetricCard
          label="Auditoria"
          value={String(indicators.auditEvents)}
          helper="Eventos de sistema e rastreabilidade."
        />
        <ProjectMetricCard
          label="Operacionais"
          value={String(indicators.operationalEvents)}
          helper="Medições, fiscalizações, documentos, riscos e pendências."
        />
        <ProjectMetricCard
          label="Vindos do campo"
          value={String(indicators.fieldEvents)}
          helper="Registros de campo e fiscalização com reflexo no projeto."
        />
      </section>

      <ProjectSectionCard
        eyebrow="Histórico"
        title="Linha do tempo consolidada"
        description="Feed cronológico usando AuditLog e eventos de execução do projeto e das áreas técnicas."
        action={
          <button
            type="button"
            onClick={() => refreshHistory().catch(() => null)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Recarregar
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Tipo</span>
            <select
              value={kindFilter}
              onChange={(event) =>
                setKindFilter((event.target.value || "") as "" | SerializedProjectHistoryEvent["kind"])
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
            >
              <option value="">Todos</option>
              {indicators.byKind.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.kind}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Área técnica</span>
            <select
              value={areaFilter}
              onChange={(event) =>
                setAreaFilter((event.target.value || "") as "" | ProjectTechnicalArea)
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
            >
              <option value="">Todas</option>
              {technicalAreas.map((area) => (
                <option key={area} value={area}>
                  {getProjectTechnicalAreaLabel(area)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Busca</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Evento, ator ou detalhe..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
            />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          {filteredEvents.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem eventos no recorte atual"
              description="Ajuste os filtros ou aguarde novos registros do projeto para alimentar a trilha cronológica."
            />
          ) : (
            filteredEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
                      <ProjectBadge label={event.badge} tone={event.tone} />
                      {event.area ? (
                        <ProjectBadge
                          label={getProjectTechnicalAreaLabel(event.area)}
                          tone="neutral"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.detail}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatHistoryEventSubtitle(event)}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </ProjectSectionCard>
    </div>
  );
}
