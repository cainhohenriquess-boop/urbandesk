import type {
  ProjectDeadlineFilterValue,
  ProjectPriorityValue,
  ProjectStatusValue,
  ProjectTypeValue,
} from "@/lib/project-portfolio";

export type PortfolioViewMode = "table" | "cards";

export interface ProjectPortfolioItem {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: ProjectStatusValue;
  projectType: ProjectTypeValue | null;
  responsibleDepartment: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  priority: ProjectPriorityValue;
  budget: number | null;
  estimatedBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  completionPct: number;
  physicalProgressPct: number;
  operationalStatus: string;
  geomWkt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { assets: number };
}

export interface ProjectPortfolioSummary {
  totalProjects: number;
  delayedProjects: number;
  inExecutionProjects: number;
  completedProjects: number;
  consolidatedBudget: number;
}

export interface ProjectPortfolioResponse {
  data: ProjectPortfolioItem[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  summary: ProjectPortfolioSummary;
  filterOptions: {
    departments: string[];
    neighborhoods: string[];
    types: ProjectTypeValue[];
    priorities: ProjectPriorityValue[];
    statuses: ProjectStatusValue[];
  };
}

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

export interface ProjectPortfolioFormState {
  id: string | null;
  code: string;
  name: string;
  description: string;
  status: ProjectStatusValue;
  projectType: "" | ProjectTypeValue;
  responsibleDepartment: string;
  neighborhood: string;
  priority: ProjectPriorityValue;
  estimatedBudget: string;
  plannedStartDate: string;
  plannedEndDate: string;
  completionPct: string;
}
