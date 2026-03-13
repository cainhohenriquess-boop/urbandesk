"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectPortfolioFilters } from "@/components/projetos/project-portfolio-filters";
import { ProjectPortfolioForm } from "@/components/projetos/project-portfolio-form";
import { ProjectPortfolioList } from "@/components/projetos/project-portfolio-list";
import { ProjectPortfolioMetrics } from "@/components/projetos/project-portfolio-metrics";
import type {
  PortfolioViewMode,
  ProjectPortfolioFiltersState,
  ProjectPortfolioFormState,
  ProjectPortfolioItem,
  ProjectPortfolioResponse,
  ProjectPortfolioSummary,
} from "@/components/projetos/project-portfolio-model";

const EMPTY_FILTERS: ProjectPortfolioFiltersState = {
  search: "",
  status: "ALL",
  department: "",
  projectType: "ALL",
  neighborhood: "",
  priority: "ALL",
  deadline: "ALL",
  budgetMin: "",
  budgetMax: "",
  includeCancelled: false,
};

const EMPTY_SUMMARY: ProjectPortfolioSummary = {
  totalProjects: 0,
  delayedProjects: 0,
  inExecutionProjects: 0,
  completedProjects: 0,
  consolidatedBudget: 0,
};

const EMPTY_OPTIONS: ProjectPortfolioResponse["filterOptions"] = {
  departments: [],
  neighborhoods: [],
  types: [],
  priorities: [],
  statuses: [],
};

const EMPTY_FORM: ProjectPortfolioFormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  status: "PLANEJADO",
  projectType: "",
  responsibleDepartment: "",
  neighborhood: "",
  priority: "MEDIA",
  estimatedBudget: "",
  plannedStartDate: "",
  plannedEndDate: "",
  completionPct: "0",
};

function formatDateInput(raw: string | null): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function validateForm(form: ProjectPortfolioFormState): string | null {
  if (form.name.trim().length < 3) {
    return "Nome deve ter pelo menos 3 caracteres.";
  }

  const completion = Number(form.completionPct);
  if (!Number.isFinite(completion) || completion < 0 || completion > 100) {
    return "Avanço deve estar entre 0 e 100%.";
  }

  if (
    form.plannedStartDate &&
    form.plannedEndDate &&
    new Date(form.plannedEndDate).getTime() < new Date(form.plannedStartDate).getTime()
  ) {
    return "Data final não pode ser anterior à data inicial.";
  }

  if (
    form.estimatedBudget.trim() &&
    (!Number.isFinite(Number(form.estimatedBudget)) || Number(form.estimatedBudget) < 0)
  ) {
    return "Orçamento estimado inválido.";
  }

  return null;
}

function toForm(project: ProjectPortfolioItem): ProjectPortfolioFormState {
  return {
    id: project.id,
    code: project.code ?? "",
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    projectType: project.projectType ?? "",
    responsibleDepartment: project.responsibleDepartment ?? "",
    neighborhood: project.neighborhood ?? "",
    priority: project.priority,
    estimatedBudget:
      project.estimatedBudget === null && project.budget === null
        ? ""
        : String(project.estimatedBudget ?? project.budget ?? ""),
    plannedStartDate: formatDateInput(project.plannedStartDate ?? project.startDate),
    plannedEndDate: formatDateInput(project.plannedEndDate ?? project.endDate),
    completionPct: String(project.completionPct),
  };
}

export function ProjectPortfolioClient() {
  const [projects, setProjects] = useState<ProjectPortfolioItem[]>([]);
  const [summary, setSummary] = useState<ProjectPortfolioSummary>(EMPTY_SUMMARY);
  const [options, setOptions] =
    useState<ProjectPortfolioResponse["filterOptions"]>(EMPTY_OPTIONS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [viewMode, setViewMode] = useState<PortfolioViewMode>("table");
  const [filters, setFilters] = useState<ProjectPortfolioFiltersState>(EMPTY_FILTERS);
  const [form, setForm] = useState<ProjectPortfolioFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.id);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "18",
        includeCancelled: filters.includeCancelled ? "true" : "false",
      });

      if (filters.search.trim()) params.set("q", filters.search.trim());
      if (filters.status !== "ALL") params.set("status", filters.status);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectType !== "ALL") params.set("projectType", filters.projectType);
      if (filters.neighborhood) params.set("neighborhood", filters.neighborhood);
      if (filters.priority !== "ALL") params.set("priority", filters.priority);
      if (filters.deadline !== "ALL") params.set("deadline", filters.deadline);
      if (filters.budgetMin.trim()) params.set("budgetMin", filters.budgetMin.trim());
      if (filters.budgetMax.trim()) params.set("budgetMax", filters.budgetMax.trim());

      const response = await fetch(`/api/projects?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | ProjectPortfolioResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string }).error ?? "Falha ao carregar a carteira."
        );
      }

      const parsed = payload as ProjectPortfolioResponse;
      setProjects(parsed.data);
      setSummary(parsed.summary);
      setOptions(parsed.filterOptions);
      setTotal(parsed.total);
      setPages(parsed.pages);
    } catch (error) {
      console.error(error);
      setFetchError(
        error instanceof Error ? error.message : "Erro ao carregar a carteira."
      );
      setProjects([]);
      setSummary(EMPTY_SUMMARY);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const updateFilters = useCallback(
    (patch: Partial<ProjectPortfolioFiltersState>) => {
      setFilters((current) => ({ ...current, ...patch }));
      setPage(1);
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const body = {
        code: form.code.trim() || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        projectType: form.projectType || null,
        responsibleDepartment: form.responsibleDepartment.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        priority: form.priority,
        estimatedBudget: form.estimatedBudget.trim() ? Number(form.estimatedBudget) : null,
        plannedStartDate: form.plannedStartDate || null,
        plannedEndDate: form.plannedEndDate || null,
        completionPct: Number(form.completionPct),
      };

      const endpoint = form.id ? `/api/projects/${form.id}` : "/api/projects";
      const method = form.id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar projeto.");
      }

      setForm(EMPTY_FORM);
      setPage(1);
      await loadProjects();
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? error.message : "Erro ao salvar projeto.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = useCallback((project: ProjectPortfolioItem) => {
    setForm(toForm(project));
    setSubmitError(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const activeFilterLabels = useMemo(() => {
    return [
      filters.search.trim() ? `Busca: ${filters.search.trim()}` : null,
      filters.status !== "ALL" ? `Status: ${filters.status}` : null,
      filters.department ? `Secretaria: ${filters.department}` : null,
      filters.projectType !== "ALL" ? `Tipo: ${filters.projectType}` : null,
      filters.neighborhood ? `Bairro: ${filters.neighborhood}` : null,
      filters.priority !== "ALL" ? `Prioridade: ${filters.priority}` : null,
      filters.deadline !== "ALL" ? `Prazo: ${filters.deadline}` : null,
      filters.budgetMin.trim() ? `Min: R$ ${filters.budgetMin.trim()}` : null,
      filters.budgetMax.trim() ? `Máx: R$ ${filters.budgetMax.trim()}` : null,
      filters.includeCancelled ? "Inclui cancelados" : null,
    ].filter((item): item is string => Boolean(item));
  }, [filters]);

  return (
    <div className="space-y-6">
      <ProjectPortfolioMetrics summary={summary} loading={loading} />

      <ProjectPortfolioFilters
        filters={filters}
        options={options}
        onChange={updateFilters}
        onReset={handleResetFilters}
      />

      {activeFilterLabels.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {activeFilterLabels.map((label) => (
            <span key={label} className="rounded-full bg-muted px-3 py-1.5">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ProjectPortfolioForm
          form={form}
          saving={saving}
          isEditing={isEditing}
          submitError={submitError}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSubmit={handleSubmit}
          onCancel={() => {
            setForm(EMPTY_FORM);
            setSubmitError(null);
          }}
        />

        <ProjectPortfolioList
          projects={projects}
          total={total}
          page={page}
          pages={pages}
          viewMode={viewMode}
          loading={loading}
          error={fetchError}
          onRetry={() => void loadProjects()}
          onPageChange={setPage}
          onViewModeChange={setViewMode}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}
