"use client";

import type { DrawMode } from "@/store/useMapStore";
import { cn, formatNumber } from "@/lib/utils";
import {
  getProjectDisciplineDefinition,
  getProjectDisciplineLabel,
  getTechnicalObjectDefinition,
  type ProjectDisciplineId,
  type TechnicalObjectTypeId,
} from "@/lib/project-disciplines";
import {
  getProjectAreaToolsetGroups,
  PROJECT_SHARED_DRAWING_TOOLS,
} from "@/lib/project-toolsets";
import { ProjectBadge } from "@/components/projetos/project-detail-components";

type ProjectMapDisciplineToolsetProps = {
  availableDisciplines: ProjectDisciplineId[];
  activeDiscipline: ProjectDisciplineId;
  disciplineCounts: Partial<Record<ProjectDisciplineId, number>>;
  drawMode: DrawMode;
  activeTechnicalObjectType: TechnicalObjectTypeId | null;
  onDisciplineChange: (discipline: ProjectDisciplineId) => void;
  onCommonToolSelect: (mode: "line" | "polygon") => void;
  onAreaToolSelect: (objectType: TechnicalObjectTypeId) => void;
};

export function ProjectMapDisciplineToolset({
  availableDisciplines,
  activeDiscipline,
  disciplineCounts,
  drawMode,
  activeTechnicalObjectType,
  onDisciplineChange,
  onCommonToolSelect,
  onAreaToolSelect,
}: ProjectMapDisciplineToolsetProps) {
  const activeDefinition = getProjectDisciplineDefinition(activeDiscipline);
  const toolsetGroups = getProjectAreaToolsetGroups(activeDiscipline);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A disciplina ativa define quais toolsets o workspace libera, quais tipos técnicos
          podem ser desenhados e quais campos aparecem no inspector.
        </p>
        <div className="grid gap-2">
          {availableDisciplines.map((discipline) => (
            <button
              key={discipline}
              onClick={() => onDisciplineChange(discipline)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-colors",
                activeDiscipline === discipline
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{getProjectDisciplineLabel(discipline)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getProjectDisciplineDefinition(discipline).description}
                  </p>
                </div>
                <ProjectBadge
                  label={`${formatNumber(disciplineCounts[discipline] ?? 0)} item(ns)`}
                  tone={activeDiscipline === discipline ? "brand" : "neutral"}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ferramentas comuns
          </p>
          <div className="mt-2 grid gap-2">
            {PROJECT_SHARED_DRAWING_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onCommonToolSelect(tool.id)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  drawMode === tool.id && !activeTechnicalObjectType
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{tool.label}</span>
                  {drawMode === tool.id && !activeTechnicalObjectType ? (
                    <ProjectBadge label="Ativo" tone="brand" />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tool.helper}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Toolsets de {getProjectDisciplineLabel(activeDiscipline)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{activeDefinition.description}</p>
            </div>
            <ProjectBadge
              label={`${formatNumber(
                toolsetGroups.reduce((acc, group) => acc + group.items.length, 0)
              )} tipo(s)`}
              tone="neutral"
            />
          </div>

          <div className="mt-3 space-y-3">
            {toolsetGroups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-border bg-background p-3">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-foreground">{group.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-2">
                  {group.items.map((toolId) => {
                    const objectDefinition = getTechnicalObjectDefinition(toolId);
                    const isActive = activeTechnicalObjectType === toolId;
                    return (
                      <button
                        key={toolId}
                        onClick={() => onAreaToolSelect(toolId)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-colors",
                          isActive
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-border bg-white text-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">
                            {objectDefinition.label}
                          </span>
                          {isActive ? <ProjectBadge label="Ativo" tone="brand" /> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {objectDefinition.helper} ·{" "}
                          {objectDefinition.geometry === "point"
                            ? "Ponto"
                            : objectDefinition.geometry === "line"
                              ? "Linha"
                              : "Polígono"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
