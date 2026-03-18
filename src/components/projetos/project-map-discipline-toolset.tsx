"use client";

import { useMemo, useState } from "react";
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
  const [filterTerm, setFilterTerm] = useState("");

  const normalizedFilter = filterTerm.trim().toLowerCase();

  const filteredSharedTools = useMemo(
    () =>
      PROJECT_SHARED_DRAWING_TOOLS.filter((tool) => {
        if (!normalizedFilter) return true;
        return `${tool.label} ${tool.helper}`.toLowerCase().includes(normalizedFilter);
      }),
    [normalizedFilter]
  );

  const filteredToolsetGroups = useMemo(
    () =>
      toolsetGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((toolId) => {
            if (!normalizedFilter) return true;
            const objectDefinition = getTechnicalObjectDefinition(toolId);
            if (!objectDefinition) return false;
            return `${objectDefinition.label} ${objectDefinition.helper}`
              .toLowerCase()
              .includes(normalizedFilter);
          }),
        }))
        .filter((group) => group.items.length > 0),
    [normalizedFilter, toolsetGroups]
  );

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
                    {getProjectDisciplineDefinition(discipline)?.description ??
                      "Disciplina técnica do projeto."}
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

      <div className="rounded-2xl border border-border bg-background p-3">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Filtrar objetos
        </label>
        <input
          value={filterTerm}
          onChange={(event) => setFilterTerm(event.target.value)}
          placeholder="Nome, tipo ou helper..."
          className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500"
        />
      </div>

      <div className="space-y-5">
        <details open className="overflow-hidden rounded-2xl border border-border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-800 px-4 py-3 text-white [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold">Ferramentas comuns</p>
              <p className="mt-1 text-xs text-slate-300">Desenho e edição base do workspace</p>
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {formatNumber(filteredSharedTools.length)}
            </span>
          </summary>
          <div className="grid gap-2 p-3">
            {filteredSharedTools.map((tool) => (
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

            {filteredSharedTools.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Nenhuma ferramenta comum corresponde ao filtro atual.
              </p>
            ) : null}
          </div>
        </details>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Toolsets de {getProjectDisciplineLabel(activeDiscipline)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeDefinition?.description ?? "Ferramentas da disciplina ativa."}
              </p>
            </div>
            <ProjectBadge
              label={`${formatNumber(
                filteredToolsetGroups.reduce((acc, group) => acc + group.items.length, 0)
              )} tipo(s)`}
              tone="neutral"
            />
          </div>

          <div className="mt-3 space-y-3">
            {filteredToolsetGroups.map((group) => (
              <details
                key={group.id}
                open
                className="overflow-hidden rounded-2xl border border-border bg-background"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-700 px-4 py-3 text-white [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="text-sm font-semibold">{group.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{group.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    {formatNumber(group.items.length)}
                  </span>
                </summary>
                <div className="grid gap-2 p-3">
                  {group.items.map((toolId) => {
                    const objectDefinition = getTechnicalObjectDefinition(toolId);
                    if (!objectDefinition) return null;
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
                          <span className="text-sm font-semibold">{objectDefinition.label}</span>
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
              </details>
            ))}

            {filteredToolsetGroups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
                Nenhum tipo técnico corresponde ao filtro atual.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
