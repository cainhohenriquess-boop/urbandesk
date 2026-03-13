"use client";

import Link from "next/link";
import {
  getProjectPriorityLabel,
  getProjectPriorityTone,
  getProjectStatusLabel,
  getProjectStatusTone,
  getProjectTypeLabel,
} from "@/lib/project-portfolio";
import { PROJECT_SORT_BY_OPTIONS } from "@/lib/project-portfolio-query";
import { formatBRL, formatDate, formatNumber } from "@/lib/utils";
import type {
  PortfolioViewMode,
  ProjectPortfolioItem,
  ProjectPortfolioSortState,
} from "@/components/projetos/project-portfolio-model";

type ProjectPortfolioListProps = {
  projects: ProjectPortfolioItem[];
  total: number;
  page: number;
  pages: number;
  viewMode: PortfolioViewMode;
  sort: ProjectPortfolioSortState;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onViewModeChange: (viewMode: PortfolioViewMode) => void;
  onEdit: (project: ProjectPortfolioItem) => void;
};

function resolveBudget(project: ProjectPortfolioItem) {
  return project.estimatedBudget ?? project.budget;
}

function resolveDeadline(project: ProjectPortfolioItem) {
  return project.plannedEndDate ?? project.endDate;
}

function renderPill(label: string, className: string) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>
      {label}
    </span>
  );
}

export function ProjectPortfolioList({
  projects,
  total,
  page,
  pages,
  viewMode,
  sort,
  loading,
  error,
  onRetry,
  onPageChange,
  onViewModeChange,
  onEdit,
}: ProjectPortfolioListProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Carteira executiva
          </p>
          <h2 className="mt-2 font-display text-xl font-700 text-foreground">
            Projetos ativos, concluídos e em risco por tenant
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatNumber(total)} projeto(s) encontrados nesta visão.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ordenação:{" "}
            {PROJECT_SORT_BY_OPTIONS.find((option) => option.value === sort.sortBy)
              ?.label ?? sort.sortBy}{" "}
            · {sort.sortOrder === "asc" ? "crescente" : "decrescente"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                viewMode === "table"
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Tabela
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("cards")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                viewMode === "cards"
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Cards
            </button>
          </div>

          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Página {page} de {pages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => onPageChange(Math.min(pages, page + 1))}
            className="rounded-lg border border-border px-2.5 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-4 text-sm text-danger-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-danger-300 px-3 py-2 text-xs font-semibold hover:bg-danger-100"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: viewMode === "table" ? 6 : 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <h3 className="font-display text-xl font-700 text-foreground">
            Nenhum projeto encontrado
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajuste os filtros ou cadastre um novo projeto para abrir a carteira.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {project.code ?? "Sem código"}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-700 text-foreground">
                    {project.name}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {renderPill(
                    getProjectStatusLabel(project.status),
                    getProjectStatusTone(project.status)
                  )}
                  {renderPill(
                    getProjectPriorityLabel(project.priority),
                    getProjectPriorityTone(project.priority)
                  )}
                </div>
              </div>

              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {project.description || "Projeto sem descrição cadastrada."}
              </p>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Tipo
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {getProjectTypeLabel(project.projectType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Secretaria
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {project.responsibleDepartment || "Não informada"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Bairro
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {project.neighborhood || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Prazo
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {resolveDeadline(project)
                      ? formatDate(resolveDeadline(project) as string)
                      : "Sem prazo"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Orçamento
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {resolveBudget(project) !== null
                      ? formatBRL(resolveBudget(project) ?? 0)
                      : "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Avanço
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {project.completionPct}%
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/app/projetos/${project.id}`}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                >
                  Abrir projeto
                </Link>
                <Link
                  href={`/app/projetos/${project.id}/mapa`}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Abrir mapa
                </Link>
                <button
                  type="button"
                  onClick={() => onEdit(project)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Secretaria</th>
                <th className="px-4 py-3">Bairro</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Orçamento</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-t border-border/70 align-top"
                >
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {project.code ?? "Sem código"}
                      </p>
                      <p className="font-semibold text-foreground">{project.name}</p>
                      <p className="line-clamp-2 max-w-sm text-xs text-muted-foreground">
                        {project.description || "Projeto sem descrição cadastrada."}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {getProjectTypeLabel(project.projectType)}
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {project.responsibleDepartment || "Não informada"}
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {project.neighborhood || "Não informado"}
                  </td>
                  <td className="px-4 py-4">
                    {renderPill(
                      getProjectStatusLabel(project.status),
                      getProjectStatusTone(project.status)
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {renderPill(
                      getProjectPriorityLabel(project.priority),
                      getProjectPriorityTone(project.priority)
                    )}
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {resolveDeadline(project)
                      ? formatDate(resolveDeadline(project) as string)
                      : "Sem prazo"}
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {resolveBudget(project) !== null
                      ? formatBRL(resolveBudget(project) ?? 0)
                      : "Não informado"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/app/projetos/${project.id}`}
                        className="rounded-lg bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-brand-500"
                      >
                        Abrir projeto
                      </Link>
                      <Link
                        href={`/app/projetos/${project.id}/mapa`}
                        className="rounded-lg border border-border px-3 py-2 text-center text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Abrir mapa
                      </Link>
                      <button
                        type="button"
                        onClick={() => onEdit(project)}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
