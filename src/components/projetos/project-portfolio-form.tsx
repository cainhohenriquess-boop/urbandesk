"use client";

import type { FormEvent } from "react";
import {
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/project-portfolio";
import { PRISMA_PROJECT_TECHNICAL_AREAS } from "@/lib/project-disciplines";
import { getProjectTechnicalAreaLabel } from "@/lib/project-labels";
import type { ProjectPortfolioFormState } from "@/components/projetos/project-portfolio-model";

type ProjectPortfolioFormProps = {
  form: ProjectPortfolioFormState;
  saving: boolean;
  isEditing: boolean;
  submitError: string | null;
  onChange: (patch: Partial<ProjectPortfolioFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function ProjectPortfolioForm({
  form,
  saving,
  isEditing,
  submitError,
  onChange,
  onSubmit,
  onCancel,
}: ProjectPortfolioFormProps) {
  const toggleTechnicalArea = (area: (typeof PRISMA_PROJECT_TECHNICAL_AREAS)[number]) => {
    const nextAreas = form.technicalAreas.includes(area)
      ? form.technicalAreas.filter((item) => item !== area)
      : [...form.technicalAreas, area];

    onChange({ technicalAreas: nextAreas });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            {isEditing ? "Edição" : "Cadastro"}
          </p>
          <h2 className="mt-2 font-display text-xl font-700 text-foreground">
            {isEditing ? "Salvar alterações do projeto" : "Salvar projeto"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre o projeto com os dados institucionais e as disciplinas técnicas
            que vão habilitar o painel e o workspace do mapa.
          </p>
        </div>

        {isEditing ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Cancelar edição
          </button>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Código
            </span>
            <input
              value={form.code}
              onChange={(event) => onChange({ code: event.target.value })}
              placeholder="Ex.: STC-RN-2026-001"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                onChange({
                  status: event.target.value as ProjectPortfolioFormState["status"],
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Nome do projeto
          </span>
          <input
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Nome executivo do projeto"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Descrição
          </span>
          <textarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Escopo resumido, objetivo e contexto urbano"
            className="min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Tipo
            </span>
            <select
              value={form.projectType}
              onChange={(event) =>
                onChange({
                  projectType: event.target.value as ProjectPortfolioFormState["projectType"],
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Selecione</option>
              {PROJECT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Prioridade
            </span>
            <select
              value={form.priority}
              onChange={(event) =>
                onChange({
                  priority: event.target.value as ProjectPortfolioFormState["priority"],
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {PROJECT_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Secretaria responsável
            </span>
            <input
              value={form.responsibleDepartment}
              onChange={(event) => onChange({ responsibleDepartment: event.target.value })}
              placeholder="Secretaria ou órgão responsável"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Bairro principal
            </span>
            <input
              value={form.neighborhood}
              onChange={(event) => onChange({ neighborhood: event.target.value })}
              placeholder="Bairro principal"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Disciplinas do projeto
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione as áreas que devem ficar disponíveis no painel técnico e no mapa.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
              {form.technicalAreas.length} selecionada(s)
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {PRISMA_PROJECT_TECHNICAL_AREAS.map((area) => {
              const active = form.technicalAreas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleTechnicalArea(area)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-brand-400 bg-brand-50 text-brand-900"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">
                      {getProjectTechnicalAreaLabel(area)}
                    </span>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                        active
                          ? "border-brand-500 bg-brand-600 text-white"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {active ? "✓" : "+"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Orçamento estimado
            </span>
            <input
              value={form.estimatedBudget}
              onChange={(event) => onChange({ estimatedBudget: event.target.value })}
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Avanço (%)
            </span>
            <input
              value={form.completionPct}
              onChange={(event) => onChange({ completionPct: event.target.value })}
              type="number"
              min={0}
              max={100}
              step={1}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Início planejado
            </span>
            <input
              value={form.plannedStartDate}
              onChange={(event) => onChange({ plannedStartDate: event.target.value })}
              type="date"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Fim planejado
            </span>
            <input
              value={form.plannedEndDate}
              onChange={(event) => onChange({ plannedEndDate: event.target.value })}
              type="date"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        {submitError ? (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar projeto"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Limpar formulário
          </button>
        </div>
      </form>
    </section>
  );
}
