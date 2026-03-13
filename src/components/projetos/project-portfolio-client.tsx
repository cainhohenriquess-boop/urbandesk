"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PROJECT_DEADLINE_FILTER_OPTIONS,
  getProjectPriorityLabel,
  getProjectStatusLabel,
  getProjectTypeLabel,
} from "@/lib/project-portfolio";
import {
  buildProjectPortfolioSearchParams,
  DEFAULT_PROJECT_PORTFOLIO_FILTERS,
  parseProjectPortfolioUrlState,
  PROJECT_SORT_BY_OPTIONS,
  type ProjectPortfolioUrlState,
} from "@/lib/project-portfolio-query";
import { ProjectPortfolioFilters } from "@/components/projetos/project-portfolio-filters";
import { ProjectPortfolioForm } from "@/components/projetos/project-portfolio-form";
import { ProjectPortfolioList } from "@/components/projetos/project-portfolio-list";
import { ProjectPortfolioMetrics } from "@/components/projetos/project-portfolio-metrics";
import type {
  ProjectPortfolioFiltersState,
  ProjectPortfolioFormState,
  ProjectPortfolioItem,
  ProjectPortfolioResponse,
  ProjectPortfolioSortState,
  ProjectPortfolioSummary,
} from "@/components/projetos/project-portfolio-model";

type UrlStatePatch = Partial<Omit<ProjectPortfolioUrlState, "filters">> & {
  filters?: Partial<ProjectPortfolioFiltersState>;
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

function buildUrl(pathname: string, state: ProjectPortfolioUrlState) {
  const params = buildProjectPortfolioSearchParams(state);
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function ProjectPortfolioClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlState = useMemo(() => parseProjectPortfolioUrlState(searchParams), [searchParams]);

  const [projects, setProjects] = useState<ProjectPortfolioItem[]>([]);
  const [summary, setSummary] = useState<ProjectPortfolioSummary>(EMPTY_SUMMARY);
  const [options, setOptions] =
    useState<ProjectPortfolioResponse["filterOptions"]>(EMPTY_OPTIONS);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [form, setForm] = useState<ProjectPortfolioFormState>(EMPTY_FORM);
  const [searchDraft, setSearchDraft] = useState(urlState.filters.search);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.id);

  useEffect(() => {
    setSearchDraft(urlState.filters.search);
  }, [urlState.filters.search]);

  const replaceUrlState = useCallback(
    (nextState: ProjectPortfolioUrlState) => {
      router.replace(buildUrl(pathname, nextState), { scroll: false });
    },
    [pathname, router]
  );

  const patchUrlState = useCallback(
    (patch: UrlStatePatch) => {
      const { filters: filterPatch, ...statePatch } = patch;
      const nextState: ProjectPortfolioUrlState = {
        ...urlState,
        ...statePatch,
        filters: {
          ...urlState.filters,
          ...(filterPatch ?? {}),
        },
      };

      replaceUrlState(nextState);
    },
    [replaceUrlState, urlState]
  );

  useEffect(() => {
    const normalizedSearch = searchDraft.trim();
    if (normalizedSearch === urlState.filters.search) return;

    const timeoutId = window.setTimeout(() => {
      patchUrlState({
        filters: { search: normalizedSearch },
        page: 1,
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [patchUrlState, searchDraft, urlState.filters.search]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const params = buildProjectPortfolioSearchParams(urlState);
      params.set("limit", "18");

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
  }, [urlState]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const updateFilters = useCallback(
    (patch: Partial<ProjectPortfolioFiltersState>) => {
      patchUrlState({ filters: patch, page: 1 });
    },
    [patchUrlState]
  );

  const updateSort = useCallback(
    (patch: Partial<ProjectPortfolioSortState>) => {
      patchUrlState({ ...patch, page: 1 });
    },
    [patchUrlState]
  );

  const handleResetFilters = useCallback(() => {
    patchUrlState({ filters: DEFAULT_PROJECT_PORTFOLIO_FILTERS, page: 1 });
  }, [patchUrlState]);

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
      if (urlState.page !== 1) {
        patchUrlState({ page: 1 });
      } else {
        await loadProjects();
      }
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
      urlState.filters.search.trim() ? `Busca: ${urlState.filters.search.trim()}` : null,
      urlState.filters.status !== "ALL"
        ? `Status: ${getProjectStatusLabel(urlState.filters.status)}`
        : null,
      urlState.filters.department
        ? `Secretaria: ${urlState.filters.department}`
        : null,
      urlState.filters.projectType !== "ALL"
        ? `Tipo: ${getProjectTypeLabel(urlState.filters.projectType)}`
        : null,
      urlState.filters.neighborhood
        ? `Bairro: ${urlState.filters.neighborhood}`
        : null,
      urlState.filters.priority !== "ALL"
        ? `Prioridade: ${getProjectPriorityLabel(urlState.filters.priority)}`
        : null,
      urlState.filters.deadline !== "ALL"
        ? `Prazo: ${
            PROJECT_DEADLINE_FILTER_OPTIONS.find(
              (option) => option.value === urlState.filters.deadline
            )?.label ?? urlState.filters.deadline
          }`
        : null,
      urlState.filters.budgetMin.trim()
        ? `Min: R$ ${urlState.filters.budgetMin.trim()}`
        : null,
      urlState.filters.budgetMax.trim()
        ? `Máx: R$ ${urlState.filters.budgetMax.trim()}`
        : null,
      urlState.filters.includeCancelled ? "Inclui cancelados" : null,
      `Ordenação: ${
        PROJECT_SORT_BY_OPTIONS.find((option) => option.value === urlState.sortBy)?.label ??
        urlState.sortBy
      }`,
    ].filter((item): item is string => Boolean(item));
  }, [urlState]);

  return (
    <div className="space-y-6">
      <ProjectPortfolioMetrics summary={summary} loading={loading} />

      <ProjectPortfolioFilters
        filters={{ ...urlState.filters, search: searchDraft }}
        sort={{ sortBy: urlState.sortBy, sortOrder: urlState.sortOrder }}
        options={options}
        onChange={(patch) => {
          if (patch.search !== undefined) {
            setSearchDraft(patch.search);
          }

          const nextPatch = { ...patch };
          delete nextPatch.search;

          if (Object.keys(nextPatch).length > 0) {
            updateFilters(nextPatch);
          }
        }}
        onSortChange={updateSort}
        onReset={() => {
          setSearchDraft("");
          handleResetFilters();
        }}
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
          page={urlState.page}
          pages={pages}
          viewMode={urlState.viewMode}
          sort={{ sortBy: urlState.sortBy, sortOrder: urlState.sortOrder }}
          loading={loading}
          error={fetchError}
          onRetry={() => void loadProjects()}
          onPageChange={(nextPage) => patchUrlState({ page: nextPage })}
          onViewModeChange={(viewMode) => patchUrlState({ viewMode })}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}
