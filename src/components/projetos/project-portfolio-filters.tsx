"use client";

import {
  PROJECT_DEADLINE_FILTER_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/project-portfolio";
import {
  PROJECT_SORT_BY_OPTIONS,
  PROJECT_SORT_ORDER_OPTIONS,
} from "@/lib/project-portfolio-query";
import type {
  ProjectPortfolioFiltersState,
  ProjectPortfolioResponse,
  ProjectPortfolioSortState,
} from "@/components/projetos/project-portfolio-model";

type ProjectPortfolioFiltersProps = {
  filters: ProjectPortfolioFiltersState;
  sort: ProjectPortfolioSortState;
  options: ProjectPortfolioResponse["filterOptions"];
  onChange: (patch: Partial<ProjectPortfolioFiltersState>) => void;
  onSortChange: (patch: Partial<ProjectPortfolioSortState>) => void;
  onReset: () => void;
};

export function ProjectPortfolioFilters({
  filters,
  sort,
  options,
  onChange,
  onSortChange,
  onReset,
}: ProjectPortfolioFiltersProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Filtros operacionais
          </p>
          <h2 className="mt-2 font-display text-xl font-700 text-foreground">
            Localize a carteira por contexto urbano, prioridade e prazo
          </h2>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Limpar filtros
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Busca textual
          </span>
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Código, nome, secretaria ou bairro"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Status
          </span>
          <select
            value={filters.status}
            onChange={(event) =>
              onChange({
                status: event.target.value as ProjectPortfolioFiltersState["status"],
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="ALL">Todos</option>
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Secretaria
          </span>
          <select
            value={filters.department}
            onChange={(event) => onChange({ department: event.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Todas</option>
            {options.departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tipo
          </span>
          <select
            value={filters.projectType}
            onChange={(event) =>
              onChange({
                projectType:
                  event.target.value as ProjectPortfolioFiltersState["projectType"],
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="ALL">Todos</option>
            {options.types.map((type) => {
              const label =
                PROJECT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
                type;

              return (
                <option key={type} value={type}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Bairro
          </span>
          <select
            value={filters.neighborhood}
            onChange={(event) => onChange({ neighborhood: event.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Todos</option>
            {options.neighborhoods.map((neighborhood) => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Prioridade
          </span>
          <select
            value={filters.priority}
            onChange={(event) =>
              onChange({
                priority:
                  event.target.value as ProjectPortfolioFiltersState["priority"],
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="ALL">Todas</option>
            {PROJECT_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Prazo
          </span>
          <select
            value={filters.deadline}
            onChange={(event) =>
              onChange({
                deadline:
                  event.target.value as ProjectPortfolioFiltersState["deadline"],
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="ALL">Todos</option>
            {PROJECT_DEADLINE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Orçamento mín.
            </span>
            <input
              value={filters.budgetMin}
              onChange={(event) => onChange({ budgetMin: event.target.value })}
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Orçamento máx.
            </span>
            <input
              value={filters.budgetMax}
              onChange={(event) => onChange({ budgetMax: event.target.value })}
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ordenar por
          </span>
          <select
            value={sort.sortBy}
            onChange={(event) =>
              onSortChange({
                sortBy: event.target.value as ProjectPortfolioSortState["sortBy"],
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            {PROJECT_SORT_BY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Direção
          </span>
          <select
            value={sort.sortOrder}
            onChange={(event) =>
              onSortChange({
                sortOrder:
                  event.target.value as ProjectPortfolioSortState["sortOrder"],
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            {PROJECT_SORT_ORDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={filters.includeCancelled}
          onChange={(event) =>
            onChange({ includeCancelled: event.target.checked })
          }
        />
        Incluir projetos cancelados na carteira
      </label>
    </section>
  );
}
