import type {
  ProjectDeadlineFilterValue,
  ProjectPriorityValue,
  ProjectStatusValue,
  ProjectTypeValue,
} from "@/lib/project-portfolio";
import {
  PROJECT_DEADLINE_FILTER_VALUES,
  PROJECT_PRIORITY_VALUES,
  PROJECT_STATUS_VALUES,
  PROJECT_TYPE_VALUES,
} from "@/lib/project-portfolio";

export const PROJECT_SORT_BY_VALUES = [
  "UPDATED_AT",
  "DEADLINE",
  "BUDGET",
  "PRIORITY",
  "STATUS",
] as const;

export const PROJECT_SORT_ORDER_VALUES = ["asc", "desc"] as const;

export type ProjectSortBy = (typeof PROJECT_SORT_BY_VALUES)[number];
export type ProjectSortOrder = (typeof PROJECT_SORT_ORDER_VALUES)[number];
export type PortfolioViewMode = "table" | "cards";

export interface ProjectPortfolioFiltersState {
  search: string;
  status: "ALL" | ProjectStatusValue;
  department: string;
  projectType: "ALL" | ProjectTypeValue;
  neighborhood: string;
  priority: "ALL" | ProjectPriorityValue;
  deadline: "ALL" | ProjectDeadlineFilterValue;
  budgetMin: string;
  budgetMax: string;
  includeCancelled: boolean;
}

export interface ProjectPortfolioUrlState {
  filters: ProjectPortfolioFiltersState;
  page: number;
  viewMode: PortfolioViewMode;
  sortBy: ProjectSortBy;
  sortOrder: ProjectSortOrder;
}

type SearchParamsLike = {
  get: (key: string) => string | null;
};

type SearchParamSource =
  | SearchParamsLike
  | Record<string, string | string[] | undefined>;

function isSearchParamsLike(source: SearchParamSource): source is SearchParamsLike {
  return typeof (source as SearchParamsLike).get === "function";
}

export const DEFAULT_PROJECT_PORTFOLIO_FILTERS: ProjectPortfolioFiltersState = {
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

export const DEFAULT_PROJECT_PORTFOLIO_URL_STATE: ProjectPortfolioUrlState = {
  filters: DEFAULT_PROJECT_PORTFOLIO_FILTERS,
  page: 1,
  viewMode: "table",
  sortBy: "UPDATED_AT",
  sortOrder: "desc",
};

export const PROJECT_SORT_BY_OPTIONS: Array<{
  value: ProjectSortBy;
  label: string;
}> = [
  { value: "UPDATED_AT", label: "Última atualização" },
  { value: "DEADLINE", label: "Prazo" },
  { value: "BUDGET", label: "Orçamento" },
  { value: "PRIORITY", label: "Prioridade" },
  { value: "STATUS", label: "Status" },
];

export const PROJECT_SORT_ORDER_OPTIONS: Array<{
  value: ProjectSortOrder;
  label: string;
}> = [
  { value: "desc", label: "Decrescente" },
  { value: "asc", label: "Crescente" },
];

function readParam(source: SearchParamSource, key: string): string | null {
  if (isSearchParamsLike(source)) {
    return source.get(key);
  }

  const raw = source[key];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function parseProjectPortfolioUrlState(
  source: SearchParamSource
): ProjectPortfolioUrlState {
  const status = readParam(source, "status");
  const projectType = readParam(source, "projectType");
  const priority = readParam(source, "priority");
  const deadline = readParam(source, "deadline");
  const viewMode = readParam(source, "view");
  const sortBy = readParam(source, "sortBy");
  const sortOrder = readParam(source, "sortOrder");

  return {
    filters: {
      search: readParam(source, "q")?.trim() ?? DEFAULT_PROJECT_PORTFOLIO_FILTERS.search,
      status:
        status === "ALL" || !status || !PROJECT_STATUS_VALUES.includes(status as ProjectStatusValue)
          ? "ALL"
          : (status as ProjectPortfolioFiltersState["status"]),
      department:
        readParam(source, "department")?.trim() ??
        DEFAULT_PROJECT_PORTFOLIO_FILTERS.department,
      projectType:
        projectType === "ALL" ||
        !projectType ||
        !PROJECT_TYPE_VALUES.includes(projectType as ProjectTypeValue)
          ? "ALL"
          : (projectType as ProjectPortfolioFiltersState["projectType"]),
      neighborhood:
        readParam(source, "neighborhood")?.trim() ??
        DEFAULT_PROJECT_PORTFOLIO_FILTERS.neighborhood,
      priority:
        priority === "ALL" ||
        !priority ||
        !PROJECT_PRIORITY_VALUES.includes(priority as ProjectPriorityValue)
          ? "ALL"
          : (priority as ProjectPortfolioFiltersState["priority"]),
      deadline:
        deadline === "ALL" ||
        !deadline ||
        !PROJECT_DEADLINE_FILTER_VALUES.includes(
          deadline as ProjectDeadlineFilterValue
        )
          ? "ALL"
          : (deadline as ProjectPortfolioFiltersState["deadline"]),
      budgetMin:
        readParam(source, "budgetMin")?.trim() ??
        DEFAULT_PROJECT_PORTFOLIO_FILTERS.budgetMin,
      budgetMax:
        readParam(source, "budgetMax")?.trim() ??
        DEFAULT_PROJECT_PORTFOLIO_FILTERS.budgetMax,
      includeCancelled: readParam(source, "includeCancelled") === "true",
    },
    page: parsePositiveInt(readParam(source, "page"), 1),
    viewMode: viewMode === "cards" ? "cards" : "table",
    sortBy: PROJECT_SORT_BY_VALUES.includes(sortBy as ProjectSortBy)
      ? (sortBy as ProjectSortBy)
      : DEFAULT_PROJECT_PORTFOLIO_URL_STATE.sortBy,
    sortOrder: PROJECT_SORT_ORDER_VALUES.includes(sortOrder as ProjectSortOrder)
      ? (sortOrder as ProjectSortOrder)
      : DEFAULT_PROJECT_PORTFOLIO_URL_STATE.sortOrder,
  };
}

export function buildProjectPortfolioSearchParams(
  state: ProjectPortfolioUrlState
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.filters.search.trim()) params.set("q", state.filters.search.trim());
  if (state.filters.status !== "ALL") params.set("status", state.filters.status);
  if (state.filters.department) params.set("department", state.filters.department);
  if (state.filters.projectType !== "ALL") {
    params.set("projectType", state.filters.projectType);
  }
  if (state.filters.neighborhood) {
    params.set("neighborhood", state.filters.neighborhood);
  }
  if (state.filters.priority !== "ALL") params.set("priority", state.filters.priority);
  if (state.filters.deadline !== "ALL") params.set("deadline", state.filters.deadline);
  if (state.filters.budgetMin.trim()) {
    params.set("budgetMin", state.filters.budgetMin.trim());
  }
  if (state.filters.budgetMax.trim()) {
    params.set("budgetMax", state.filters.budgetMax.trim());
  }
  if (state.filters.includeCancelled) params.set("includeCancelled", "true");
  if (state.page > 1) params.set("page", String(state.page));
  if (state.viewMode !== DEFAULT_PROJECT_PORTFOLIO_URL_STATE.viewMode) {
    params.set("view", state.viewMode);
  }
  if (state.sortBy !== DEFAULT_PROJECT_PORTFOLIO_URL_STATE.sortBy) {
    params.set("sortBy", state.sortBy);
  }
  if (state.sortOrder !== DEFAULT_PROJECT_PORTFOLIO_URL_STATE.sortOrder) {
    params.set("sortOrder", state.sortOrder);
  }

  return params;
}
