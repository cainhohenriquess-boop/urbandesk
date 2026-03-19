"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { ProjectTechnicalArea } from "@prisma/client";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getDisciplineObjectTypes } from "@/lib/project-disciplines";
import {
  PROJECT_CRITICALITY_VALUES,
  PROJECT_ISSUE_STATUS_VALUES,
  PROJECT_ISSUE_TYPE_VALUES,
  PROJECT_PRIORITY_VALUES,
  PROJECT_RISK_CATEGORY_VALUES,
  PROJECT_RISK_IMPACT_VALUES,
  PROJECT_RISK_PROBABILITY_VALUES,
  PROJECT_RISK_STATUS_VALUES,
  type ProjectGovernanceIndicators,
  type SerializedProjectIssue,
  type SerializedProjectRisk,
} from "@/lib/project-governance";
import {
  getGovernanceTone,
  getProjectCriticalityLabel,
  getProjectIssueStatusLabel,
  getProjectIssueTypeLabel,
  getProjectRiskCategoryLabel,
  getProjectRiskImpactLabel,
  getProjectRiskProbabilityLabel,
  getProjectRiskStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { cn, formatDate, formatNumber } from "@/lib/utils";

type GovernanceOptions = {
  technicalAreas: ProjectTechnicalArea[];
  phases: Array<{
    id: string;
    name: string;
    sequence: number;
    technicalArea: ProjectTechnicalArea | null;
  }>;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    technicalArea: ProjectTechnicalArea | null;
    technicalObjectType: string | null;
  }>;
};

type GovernanceCompatibility = {
  governanceOpsSchemaReady: boolean;
  notice: string | null;
};

type ProjectGovernanceClientProps = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  initialIssues: SerializedProjectIssue[];
  initialRisks: SerializedProjectRisk[];
  initialIndicators: ProjectGovernanceIndicators;
  initialOptions: GovernanceOptions;
  compatibility: GovernanceCompatibility;
  canManageGovernance: boolean;
};

type IssueFormState = {
  title: string;
  description: string;
  issueType: (typeof PROJECT_ISSUE_TYPE_VALUES)[number];
  status: (typeof PROJECT_ISSUE_STATUS_VALUES)[number];
  priority: (typeof PROJECT_PRIORITY_VALUES)[number];
  severity: (typeof PROJECT_CRITICALITY_VALUES)[number];
  dueDate: string;
  phaseId: string;
  assetId: string;
  technicalArea: "" | ProjectTechnicalArea;
  technicalObjectType: string;
  assignedToId: string;
  resolutionNotes: string;
};

type RiskFormState = {
  title: string;
  description: string;
  category: (typeof PROJECT_RISK_CATEGORY_VALUES)[number];
  status: (typeof PROJECT_RISK_STATUS_VALUES)[number];
  probability: (typeof PROJECT_RISK_PROBABILITY_VALUES)[number];
  impact: (typeof PROJECT_RISK_IMPACT_VALUES)[number];
  reviewDate: string;
  phaseId: string;
  assetId: string;
  technicalArea: "" | ProjectTechnicalArea;
  technicalObjectType: string;
  ownerId: string;
  mitigationPlan: string;
  contingencyPlan: string;
};

const EMPTY_ISSUE_FORM: IssueFormState = {
  title: "",
  description: "",
  issueType: "OUTRO",
  status: "ABERTA",
  priority: "MEDIA",
  severity: "MEDIA",
  dueDate: "",
  phaseId: "",
  assetId: "",
  technicalArea: "",
  technicalObjectType: "",
  assignedToId: "",
  resolutionNotes: "",
};

const EMPTY_RISK_FORM: RiskFormState = {
  title: "",
  description: "",
  category: "OUTRO",
  status: "IDENTIFICADO",
  probability: "MEDIA",
  impact: "MEDIO",
  reviewDate: "",
  phaseId: "",
  assetId: "",
  technicalArea: "",
  technicalObjectType: "",
  ownerId: "",
  mitigationPlan: "",
  contingencyPlan: "",
};

function inputClassName() {
  return "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400";
}

function priorityLabel(value: IssueFormState["priority"]) {
  switch (value) {
    case "BAIXA":
      return "Baixa";
    case "MEDIA":
      return "Média";
    case "ALTA":
      return "Alta";
    case "URGENTE":
      return "Urgente";
    default:
      return value;
  }
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toIssueForm(issue: SerializedProjectIssue): IssueFormState {
  return {
    title: issue.title,
    description: issue.description ?? "",
    issueType: issue.issueType,
    status: issue.status,
    priority: issue.priority,
    severity: issue.severity,
    dueDate: toDateInput(issue.dueDate),
    phaseId: issue.phase?.id ?? "",
    assetId: issue.asset?.id ?? "",
    technicalArea: issue.technicalArea ?? "",
    technicalObjectType: issue.technicalObjectType ?? "",
    assignedToId: issue.assignedTo?.id ?? "",
    resolutionNotes: issue.resolutionNotes ?? "",
  };
}

function toRiskForm(risk: SerializedProjectRisk): RiskFormState {
  return {
    title: risk.title,
    description: risk.description ?? "",
    category: risk.category,
    status: risk.status,
    probability: risk.probability,
    impact: risk.impact,
    reviewDate: toDateInput(risk.reviewDate),
    phaseId: risk.phase?.id ?? "",
    assetId: risk.asset?.id ?? "",
    technicalArea: risk.technicalArea ?? "",
    technicalObjectType: risk.technicalObjectType ?? "",
    ownerId: risk.owner?.id ?? "",
    mitigationPlan: risk.mitigationPlan ?? "",
    contingencyPlan: risk.contingencyPlan ?? "",
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
export function ProjectGovernanceClient({
  projectId,
  projectCode,
  projectName,
  initialIssues,
  initialRisks,
  initialIndicators,
  initialOptions,
  compatibility,
  canManageGovernance,
}: ProjectGovernanceClientProps) {
  const [issues, setIssues] = useState(initialIssues);
  const [risks, setRisks] = useState(initialRisks);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [options, setOptions] = useState(initialOptions);
  const [issueForm, setIssueForm] = useState<IssueFormState>(EMPTY_ISSUE_FORM);
  const [riskForm, setRiskForm] = useState<RiskFormState>(EMPTY_RISK_FORM);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | "issues" | "risks">("all");
  const [areaFilter, setAreaFilter] = useState<"" | ProjectTechnicalArea>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<"issue" | "risk" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const issueObjectOptions = useMemo(() => {
    if (!issueForm.technicalArea) return [];
    return getDisciplineObjectTypes(issueForm.technicalArea).flatMap((item) =>
      item
        ? [
            {
              value: item.id,
              label: item.label,
            },
          ]
        : []
    );
  }, [issueForm.technicalArea]);

  const riskObjectOptions = useMemo(() => {
    if (!riskForm.technicalArea) return [];
    return getDisciplineObjectTypes(riskForm.technicalArea).flatMap((item) =>
      item
        ? [
            {
              value: item.id,
              label: item.label,
            },
          ]
        : []
    );
  }, [riskForm.technicalArea]);

  const statusOptions = useMemo(() => {
    const values =
      kindFilter === "issues"
        ? issues.map((item) => item.status)
        : kindFilter === "risks"
          ? risks.map((item) => item.status)
          : [...issues.map((item) => item.status), ...risks.map((item) => item.status)];
    return [...new Set(values)].sort();
  }, [issues, kindFilter, risks]);

  const filteredIssues = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (kindFilter === "risks") return false;
      if (areaFilter && issue.technicalArea !== areaFilter) return false;
      if (statusFilter && issue.status !== statusFilter) return false;
      if (!normalized) return true;
      return [
        issue.title,
        issue.description,
        issue.assignedTo?.name,
        issue.asset?.name,
        issue.phase?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [areaFilter, issues, kindFilter, search, statusFilter]);

  const filteredRisks = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return risks.filter((risk) => {
      if (kindFilter === "issues") return false;
      if (areaFilter && risk.technicalArea !== areaFilter) return false;
      if (statusFilter && risk.status !== statusFilter) return false;
      if (!normalized) return true;
      return [risk.title, risk.description, risk.owner?.name, risk.asset?.name, risk.phase?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [areaFilter, kindFilter, risks, search, statusFilter]);

  const syncPayload = (payload: {
    issues?: SerializedProjectIssue[];
    risks?: SerializedProjectRisk[];
    indicators?: ProjectGovernanceIndicators;
    options?: GovernanceOptions;
  }) => {
    if (payload.issues) setIssues(payload.issues);
    if (payload.risks) setRisks(payload.risks);
    if (payload.indicators) setIndicators(payload.indicators);
    if (payload.options) setOptions(payload.options);
  };

  const resetIssueForm = () => {
    setIssueForm(EMPTY_ISSUE_FORM);
    setEditingIssueId(null);
  };

  const resetRiskForm = () => {
    setRiskForm(EMPTY_RISK_FORM);
    setEditingRiskId(null);
  };

  const refreshGovernance = async () => {
    setSubmitError(null);
    const response = await fetch(`/api/projects/${projectId}/governance`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? "Falha ao recarregar pendências e riscos.");
    }
    syncPayload(payload as Parameters<typeof syncPayload>[0]);
  };

  const handleIssueSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving("issue");
    setSubmitError(null);
    setFeedback(null);
    try {
      const response = await fetch(
        editingIssueId
          ? `/api/projects/${projectId}/issues/${editingIssueId}`
          : `/api/projects/${projectId}/issues`,
        {
          method: editingIssueId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...issueForm,
            description: issueForm.description || null,
            dueDate: issueForm.dueDate || null,
            phaseId: issueForm.phaseId || null,
            assetId: issueForm.assetId || null,
            technicalArea: issueForm.technicalArea || null,
            technicalObjectType: issueForm.technicalObjectType || null,
            assignedToId: issueForm.assignedToId || null,
            resolutionNotes: issueForm.resolutionNotes || null,
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar a pendência.");
      }
      syncPayload(payload as Parameters<typeof syncPayload>[0]);
      resetIssueForm();
      setFeedback(payload?.message ?? "Pendência salva com sucesso.");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Falha ao salvar a pendência."
      );
    } finally {
      setSaving(null);
    }
  };

  const handleRiskSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving("risk");
    setSubmitError(null);
    setFeedback(null);
    try {
      const response = await fetch(
        editingRiskId
          ? `/api/projects/${projectId}/risks/${editingRiskId}`
          : `/api/projects/${projectId}/risks`,
        {
          method: editingRiskId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...riskForm,
            description: riskForm.description || null,
            reviewDate: riskForm.reviewDate || null,
            phaseId: riskForm.phaseId || null,
            assetId: riskForm.assetId || null,
            technicalArea: riskForm.technicalArea || null,
            technicalObjectType: riskForm.technicalObjectType || null,
            ownerId: riskForm.ownerId || null,
            mitigationPlan: riskForm.mitigationPlan || null,
            contingencyPlan: riskForm.contingencyPlan || null,
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar o risco.");
      }
      syncPayload(payload as Parameters<typeof syncPayload>[0]);
      resetRiskForm();
      setFeedback(payload?.message ?? "Risco salvo com sucesso.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Falha ao salvar o risco.");
    } finally {
      setSaving(null);
    }
  };
  return (
    <div className="space-y-6">
      {!compatibility.governanceOpsSchemaReady && compatibility.notice ? (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          {compatibility.notice}
        </div>
      ) : null}
      {feedback ? (
        <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
          {feedback}
        </div>
      ) : null}
      {submitError ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
          {submitError}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard label="Pendências abertas" value={formatNumber(indicators.openIssues)} helper="Itens ainda em tratamento no projeto." />
        <ProjectMetricCard label="Pendências críticas" value={formatNumber(indicators.criticalIssues)} helper="Severidade alta ou crítica." />
        <ProjectMetricCard label="Riscos ativos" value={formatNumber(indicators.activeRisks)} helper="Riscos ainda monitorados pela equipe." />
        <ProjectMetricCard label="Risco alto" value={formatNumber(indicators.highExposureRisks)} helper="Probabilidade e impacto em faixa elevada." />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <ProjectSectionCard
          eyebrow="Pendências e riscos"
          title={projectCode ? `${projectCode} · ${projectName}` : projectName}
          description="Acompanhe bloqueios, não conformidades e riscos com rastreabilidade por responsável, prazo, severidade e área técnica."
          action={
            <button
              type="button"
              onClick={() =>
                refreshGovernance().catch((error: unknown) =>
                  setSubmitError(error instanceof Error ? error.message : "Falha ao recarregar.")
                )
              }
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Recarregar
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Tipo">
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)} className={inputClassName()}>
                <option value="all">Tudo</option>
                <option value="issues">Pendências</option>
                <option value="risks">Riscos</option>
              </select>
            </Field>
            <Field label="Área técnica">
              <select value={areaFilter} onChange={(event) => setAreaFilter((event.target.value || "") as "" | ProjectTechnicalArea)} className={inputClassName()}>
                <option value="">Todas</option>
                {options.technicalAreas.map((area) => (
                  <option key={area} value={area}>
                    {getProjectTechnicalAreaLabel(area)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClassName()}>
                <option value="">Todos</option>
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Busca">
              <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, responsável ou área..." className={inputClassName()} />
            </Field>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">Pendências</h3>
                <ProjectBadge label={`${formatNumber(filteredIssues.length)} item(ns)`} tone="neutral" />
              </div>
              {filteredIssues.length === 0 ? (
                <ProjectEmptyBlock title="Sem pendências" description="Ajuste os filtros ou registre uma nova pendência." />
              ) : (
                filteredIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => {
                      setEditingIssueId(issue.id);
                      setIssueForm(toIssueForm(issue));
                    }}
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-4 text-left transition hover:border-brand-300",
                      editingIssueId === issue.id && "border-brand-300 bg-brand-50/40"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{issue.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getProjectIssueTypeLabel(issue.issueType)} · {getProjectCriticalityLabel(issue.severity)} · {priorityLabel(issue.priority)}
                        </p>
                      </div>
                      <ProjectBadge label={getProjectIssueStatusLabel(issue.status)} tone={getGovernanceTone(issue.status)} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {issue.assignedTo?.name || "Sem responsável"} · {issue.dueDate ? formatDate(issue.dueDate) : "Sem prazo"}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">Riscos</h3>
                <ProjectBadge label={`${formatNumber(filteredRisks.length)} item(ns)`} tone="neutral" />
              </div>
              {filteredRisks.length === 0 ? (
                <ProjectEmptyBlock title="Sem riscos" description="Ajuste os filtros ou registre um novo risco." />
              ) : (
                filteredRisks.map((risk) => (
                  <button
                    key={risk.id}
                    type="button"
                    onClick={() => {
                      setEditingRiskId(risk.id);
                      setRiskForm(toRiskForm(risk));
                    }}
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-4 text-left transition hover:border-brand-300",
                      editingRiskId === risk.id && "border-brand-300 bg-brand-50/40"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getProjectRiskCategoryLabel(risk.category)} · {getProjectRiskProbabilityLabel(risk.probability)} x {getProjectRiskImpactLabel(risk.impact)}
                        </p>
                      </div>
                      <ProjectBadge label={getProjectRiskStatusLabel(risk.status)} tone={getGovernanceTone(risk.status)} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {risk.owner?.name || "Sem responsável"} · {risk.reviewDate ? formatDate(risk.reviewDate) : "Sem revisão"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </ProjectSectionCard>
        <div className="space-y-6">
          <ProjectSectionCard eyebrow="Pendência" title={editingIssueId ? "Editar pendência" : "Nova pendência"} action={editingIssueId ? <button type="button" onClick={resetIssueForm} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Limpar</button> : null}>
            <form className="space-y-4" onSubmit={handleIssueSubmit}>
              <Field label="Título"><input value={issueForm.title} onChange={(event) => setIssueForm((current) => ({ ...current, title: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"} /></Field>
              <Field label="Descrição"><textarea value={issueForm.description} onChange={(event) => setIssueForm((current) => ({ ...current, description: event.target.value }))} rows={3} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo"><select value={issueForm.issueType} onChange={(event) => setIssueForm((current) => ({ ...current, issueType: event.target.value as IssueFormState["issueType"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}>{PROJECT_ISSUE_TYPE_VALUES.map((value) => <option key={value} value={value}>{getProjectIssueTypeLabel(value)}</option>)}</select></Field>
                <Field label="Status"><select value={issueForm.status} onChange={(event) => setIssueForm((current) => ({ ...current, status: event.target.value as IssueFormState["status"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}>{PROJECT_ISSUE_STATUS_VALUES.map((value) => <option key={value} value={value}>{getProjectIssueStatusLabel(value)}</option>)}</select></Field>
                <Field label="Severidade"><select value={issueForm.severity} onChange={(event) => setIssueForm((current) => ({ ...current, severity: event.target.value as IssueFormState["severity"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}>{PROJECT_CRITICALITY_VALUES.map((value) => <option key={value} value={value}>{getProjectCriticalityLabel(value)}</option>)}</select></Field>
                <Field label="Prioridade"><select value={issueForm.priority} onChange={(event) => setIssueForm((current) => ({ ...current, priority: event.target.value as IssueFormState["priority"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}>{PROJECT_PRIORITY_VALUES.map((value) => <option key={value} value={value}>{priorityLabel(value)}</option>)}</select></Field>
                <Field label="Prazo"><input type="date" value={issueForm.dueDate} onChange={(event) => setIssueForm((current) => ({ ...current, dueDate: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"} /></Field>
                <Field label="Responsável"><select value={issueForm.assignedToId} onChange={(event) => setIssueForm((current) => ({ ...current, assignedToId: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}><option value="">Não definido</option>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
                <Field label="Etapa"><select value={issueForm.phaseId} onChange={(event) => setIssueForm((current) => ({ ...current, phaseId: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}><option value="">Sem etapa</option>{options.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.sequence}. {phase.name}</option>)}</select></Field>
                <Field label="Área técnica"><select value={issueForm.technicalArea} onChange={(event) => setIssueForm((current) => ({ ...current, technicalArea: (event.target.value || "") as "" | ProjectTechnicalArea, technicalObjectType: "" }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}><option value="">Não vinculada</option>{options.technicalAreas.map((area) => <option key={area} value={area}>{getProjectTechnicalAreaLabel(area)}</option>)}</select></Field>
                <Field label="Objeto técnico"><select value={issueForm.technicalObjectType} onChange={(event) => setIssueForm((current) => ({ ...current, technicalObjectType: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}><option value="">Não vinculado</option>{issueObjectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              </div>
              <Field label="Objeto relacionado"><select value={issueForm.assetId} onChange={(event) => setIssueForm((current) => ({ ...current, assetId: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"}><option value="">Sem vínculo direto</option>{options.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.type}</option>)}</select></Field>
              <Field label="Notas de resolução"><textarea value={issueForm.resolutionNotes} onChange={(event) => setIssueForm((current) => ({ ...current, resolutionNotes: event.target.value }))} rows={3} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"} /></Field>
              <button type="submit" disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "issue"} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60">{saving === "issue" ? "Salvando..." : editingIssueId ? "Salvar pendência" : "Criar pendência"}</button>
            </form>
          </ProjectSectionCard>

          <ProjectSectionCard eyebrow="Risco" title={editingRiskId ? "Editar risco" : "Novo risco"} action={editingRiskId ? <button type="button" onClick={resetRiskForm} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Limpar</button> : null}>
            <form className="space-y-4" onSubmit={handleRiskSubmit}>
              <Field label="Título"><input value={riskForm.title} onChange={(event) => setRiskForm((current) => ({ ...current, title: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"} /></Field>
              <Field label="Descrição"><textarea value={riskForm.description} onChange={(event) => setRiskForm((current) => ({ ...current, description: event.target.value }))} rows={3} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Categoria"><select value={riskForm.category} onChange={(event) => setRiskForm((current) => ({ ...current, category: event.target.value as RiskFormState["category"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}>{PROJECT_RISK_CATEGORY_VALUES.map((value) => <option key={value} value={value}>{getProjectRiskCategoryLabel(value)}</option>)}</select></Field>
                <Field label="Status"><select value={riskForm.status} onChange={(event) => setRiskForm((current) => ({ ...current, status: event.target.value as RiskFormState["status"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}>{PROJECT_RISK_STATUS_VALUES.map((value) => <option key={value} value={value}>{getProjectRiskStatusLabel(value)}</option>)}</select></Field>
                <Field label="Probabilidade"><select value={riskForm.probability} onChange={(event) => setRiskForm((current) => ({ ...current, probability: event.target.value as RiskFormState["probability"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}>{PROJECT_RISK_PROBABILITY_VALUES.map((value) => <option key={value} value={value}>{getProjectRiskProbabilityLabel(value)}</option>)}</select></Field>
                <Field label="Impacto"><select value={riskForm.impact} onChange={(event) => setRiskForm((current) => ({ ...current, impact: event.target.value as RiskFormState["impact"] }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}>{PROJECT_RISK_IMPACT_VALUES.map((value) => <option key={value} value={value}>{getProjectRiskImpactLabel(value)}</option>)}</select></Field>
                <Field label="Revisão"><input type="date" value={riskForm.reviewDate} onChange={(event) => setRiskForm((current) => ({ ...current, reviewDate: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"} /></Field>
                <Field label="Responsável"><select value={riskForm.ownerId} onChange={(event) => setRiskForm((current) => ({ ...current, ownerId: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}><option value="">Não definido</option>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
                <Field label="Etapa"><select value={riskForm.phaseId} onChange={(event) => setRiskForm((current) => ({ ...current, phaseId: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}><option value="">Sem etapa</option>{options.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.sequence}. {phase.name}</option>)}</select></Field>
                <Field label="Área técnica"><select value={riskForm.technicalArea} onChange={(event) => setRiskForm((current) => ({ ...current, technicalArea: (event.target.value || "") as "" | ProjectTechnicalArea, technicalObjectType: "" }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}><option value="">Não vinculada</option>{options.technicalAreas.map((area) => <option key={area} value={area}>{getProjectTechnicalAreaLabel(area)}</option>)}</select></Field>
                <Field label="Objeto técnico"><select value={riskForm.technicalObjectType} onChange={(event) => setRiskForm((current) => ({ ...current, technicalObjectType: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}><option value="">Não vinculado</option>{riskObjectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              </div>
              <Field label="Objeto relacionado"><select value={riskForm.assetId} onChange={(event) => setRiskForm((current) => ({ ...current, assetId: event.target.value }))} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"}><option value="">Sem vínculo direto</option>{options.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.type}</option>)}</select></Field>
              <Field label="Plano de mitigação"><textarea value={riskForm.mitigationPlan} onChange={(event) => setRiskForm((current) => ({ ...current, mitigationPlan: event.target.value }))} rows={3} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"} /></Field>
              <Field label="Plano de contingência"><textarea value={riskForm.contingencyPlan} onChange={(event) => setRiskForm((current) => ({ ...current, contingencyPlan: event.target.value }))} rows={3} className={inputClassName()} disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"} /></Field>
              <button type="submit" disabled={!canManageGovernance || !compatibility.governanceOpsSchemaReady || saving === "risk"} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60">{saving === "risk" ? "Salvando..." : editingRiskId ? "Salvar risco" : "Criar risco"}</button>
            </form>
          </ProjectSectionCard>
        </div>
      </div>
      {!canManageGovernance ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Seu perfil está em modo de leitura nesta aba. A gestão executiva fica disponível para perfis de secretaria, engenharia e superadmin.
        </div>
      ) : null}
    </div>
  );
}
