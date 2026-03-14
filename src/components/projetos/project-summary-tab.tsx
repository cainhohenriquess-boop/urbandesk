import Link from "next/link";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectProgressCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import type { ProjectOverviewData } from "@/lib/project-detail-data";
import {
  resolveProjectContractedAmount,
  resolveProjectContractorName,
  resolveProjectDeadline,
  resolveProjectFinancialProgress,
  resolveProjectLocation,
  resolveProjectMeasuredAmount,
  resolveProjectPaidAmount,
  resolveProjectPhysicalProgress,
} from "@/lib/project-detail-data";
import {
  getGovernanceTone,
  getProjectContractStatusLabel,
  getProjectInspectionStatusLabel,
  getProjectInspectionTypeLabel,
  getProjectIssueStatusLabel,
  getProjectIssueTypeLabel,
  getProjectMeasurementStatusLabel,
  getProjectOperationalStatusLabel,
  getProjectRiskCategoryLabel,
  getProjectRiskImpactLabel,
  getProjectRiskProbabilityLabel,
  getProjectRiskStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import {
  getProjectPriorityLabel,
  getProjectStatusLabel,
  getProjectTypeLabel,
} from "@/lib/project-portfolio";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatDistance,
  formatNumber,
  truncate,
} from "@/lib/utils";

type SummaryTone = "neutral" | "brand" | "success" | "warning" | "danger";

type SummaryEvent = {
  id: string;
  title: string;
  detail: string;
  timestamp: Date;
  tone: SummaryTone;
  badge?: string;
};

const milestoneStatusLabels: Record<string, string> = {
  PLANEJADO: "Planejado",
  EM_RISCO: "Em risco",
  CONCLUIDO: "Concluído",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

const fundingSourceTypeLabels: Record<string, string> = {
  TESOURO: "Tesouro",
  CONVENIO: "Convênio",
  OPERACAO_CREDITO: "Operação de crédito",
  FINANCIAMENTO: "Financiamento",
  EMENDA: "Emenda",
  FUNDO: "Fundo",
  PARCERIA: "Parceria",
  OUTRO: "Outro",
};

const fundingSourceStatusLabels: Record<string, string> = {
  PLANEJADA: "Planejada",
  ASSEGURADA: "Assegurada",
  LIBERADA: "Liberada",
  BLOQUEADA: "Bloqueada",
  ENCERRADA: "Encerrada",
};

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "Não informado" : formatBRL(value);
}

function formatDateValue(value: Date | string | null | undefined, empty = "Não informado") {
  return value ? formatDate(value) : empty;
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "Não informado";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getMilestoneStatusLabel(status: string) {
  return milestoneStatusLabels[status] ?? formatEnumLabel(status);
}

function getFundingSourceTypeLabel(value: string) {
  return fundingSourceTypeLabels[value] ?? formatEnumLabel(value);
}

function getFundingSourceStatusLabel(value: string) {
  return fundingSourceStatusLabels[value] ?? formatEnumLabel(value);
}

function getVisibilityLabel(isPublic: boolean) {
  return isPublic ? "Visível ao cidadão" : "Uso administrativo";
}

function getPriorityRank(priority: string | null | undefined) {
  switch (priority) {
    case "URGENTE":
      return 4;
    case "ALTA":
      return 3;
    case "MEDIA":
      return 2;
    case "BAIXA":
      return 1;
    default:
      return 0;
  }
}

function getRiskImpactRank(impact: string | null | undefined) {
  switch (impact) {
    case "CRITICO":
      return 4;
    case "ALTO":
      return 3;
    case "MEDIO":
      return 2;
    case "BAIXO":
      return 1;
    default:
      return 0;
  }
}

function isOpenIssue(status: string) {
  return status === "ABERTA" || status === "EM_TRATATIVA";
}

function isActionableRisk(status: string) {
  return status !== "ENCERRADO" && status !== "MITIGADO";
}

function isDelayedPhase(phase: { status: string; plannedEndDate: Date | null }) {
  if (!phase.plannedEndDate) return false;
  if (phase.status === "CONCLUIDA" || phase.status === "CANCELADA") return false;
  return phase.plannedEndDate.getTime() < Date.now();
}

function commentContextLabel(comment: ProjectOverviewData["comments"][number]) {
  if (comment.issue) return `Pendência: ${comment.issue.title}`;
  if (comment.risk) return `Risco: ${comment.risk.title}`;
  if (comment.inspection) {
    return `Fiscalização ${getProjectInspectionTypeLabel(comment.inspection.inspectionType)}`;
  }
  if (comment.measurement) return `Medição #${comment.measurement.measurementNumber}`;
  if (comment.milestone) return `Marco: ${comment.milestone.title}`;
  if (comment.phase) return `Fase: ${comment.phase.name}`;
  return "Projeto";
}

function getAuditTone(action: string): SummaryTone {
  const normalized = action.toLowerCase();
  if (
    normalized.includes("delete") ||
    normalized.includes("remove") ||
    normalized.includes("suspend") ||
    normalized.includes("error") ||
    normalized.includes("fail")
  ) {
    return "danger";
  }
  if (
    normalized.includes("create") ||
    normalized.includes("upload") ||
    normalized.includes("approve")
  ) {
    return "success";
  }
  if (normalized.includes("update") || normalized.includes("status")) {
    return "warning";
  }
  return "brand";
}
function buildRecentEvents(data: ProjectOverviewData): SummaryEvent[] {
  const commentEvents: SummaryEvent[] = data.comments.map((comment) => ({
    id: `comment-${comment.id}`,
    title: `Comentário de ${comment.author?.name || "usuário"}`,
    detail: `${commentContextLabel(comment)} · ${truncate(comment.body, 112)}`,
    timestamp: comment.createdAt,
    tone: comment.isInternal ? "neutral" : "brand",
    badge: comment.isInternal ? "Interno" : "Compartilhável",
  }));

  const auditEvents: SummaryEvent[] = data.auditLogs.map((log) => ({
    id: `audit-${log.id}`,
    title: formatEnumLabel(log.action),
    detail: [log.userName || log.userEmail || "Sistema", formatEnumLabel(log.entityType)]
      .filter(Boolean)
      .join(" · "),
    timestamp: log.createdAt,
    tone: getAuditTone(log.action),
    badge: log.entityType ? formatEnumLabel(log.entityType) : "Auditoria",
  }));

  const inspectionEvents: SummaryEvent[] = data.inspections.map((inspection) => ({
    id: `inspection-${inspection.id}`,
    title: `${getProjectInspectionTypeLabel(
      inspection.inspectionType
    )} ${getProjectInspectionStatusLabel(inspection.status).toLowerCase()}`,
    detail: [
      inspection.phase ? `Fase ${inspection.phase.sequence}` : null,
      inspection.inspector?.name || null,
      inspection._count.issues > 0 ? `${inspection._count.issues} pendência(s)` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: inspection.occurredAt ?? inspection.scheduledAt ?? inspection.createdAt,
    tone:
      inspection.status === "REALIZADA"
        ? "success"
        : inspection.status === "AGENDADA"
          ? "brand"
          : "warning",
    badge: "Fiscalização",
  }));

  const measurementEvents: SummaryEvent[] = data.measurements.map((measurement) => ({
    id: `measurement-${measurement.id}`,
    title: `Medição #${measurement.measurementNumber} ${getProjectMeasurementStatusLabel(
      measurement.status
    ).toLowerCase()}`,
    detail: [
      measurement.phase ? measurement.phase.name : null,
      measurement.measuredAmount ? formatBRL(Number(measurement.measuredAmount)) : null,
      measurement.measuredBy?.name || null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: measurement.measuredAt ?? measurement.referenceMonth ?? measurement.updatedAt,
    tone:
      measurement.status === "PAGA"
        ? "success"
        : measurement.status === "APROVADA"
          ? "brand"
          : measurement.status === "REJEITADA"
            ? "danger"
            : "warning",
    badge: "Medição",
  }));

  return [...commentEvents, ...auditEvents, ...inspectionEvents, ...measurementEvents]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 7);
}

function SummaryDetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function SummaryEventItem({ event }: { event: SummaryEvent }) {
  return (
    <article className="rounded-xl border border-border bg-background px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.detail}</p>
        </div>
        {event.badge ? <ProjectBadge label={event.badge} tone={event.tone} /> : null}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {formatDateTime(event.timestamp)}
      </p>
    </article>
  );
}

export function ProjectSummaryTab({ data }: { data: ProjectOverviewData }) {
  const {
    project,
    phases,
    milestones,
    contracts,
    fundingSources,
    documents,
    measurements,
    inspections,
    issues,
    risks,
    comments,
    auditLogs,
    assetGroups,
    recentAssets,
    measurementTotals,
    pavementSummary,
  } = data;

  const contractedAmount = resolveProjectContractedAmount(project);
  const measuredAmount =
    resolveProjectMeasuredAmount(project) ??
    (measurementTotals._sum.measuredAmount === null
      ? null
      : Number(measurementTotals._sum.measuredAmount));
  const paidAmount =
    resolveProjectPaidAmount(project) ??
    (measurementTotals._sum.paidAmount === null ? null : Number(measurementTotals._sum.paidAmount));
  const approvedAmount =
    measurementTotals._sum.approvedAmount === null
      ? null
      : Number(measurementTotals._sum.approvedAmount);
  const physicalProgress = resolveProjectPhysicalProgress(project);
  const financialProgress = resolveProjectFinancialProgress(project);
  const deadline = resolveProjectDeadline(project);
  const locationLabel = resolveProjectLocation(project);
  const contractorLabel = resolveProjectContractorName(project);
  const totalAssets = assetGroups.reduce((sum, group) => sum + group._count._all, 0);
  const primaryContract = contracts[0] ?? null;
  const primaryFundingSource =
    fundingSources.find((item) => item.isPrimary) ?? fundingSources[0] ?? null;
  const latestMeasurement = measurements[0] ?? null;
  const latestInspection = inspections[0] ?? null;
  const openIssues = issues.filter((issue) => isOpenIssue(issue.status));
  const activeRisks = risks.filter((risk) => isActionableRisk(risk.status));
  const delayedPhases = phases.filter((phase) => isDelayedPhase(phase));
  const completedPhases = phases.filter((phase) => phase.status === "CONCLUIDA");
  const executionPhases = phases.filter((phase) => phase.status === "EM_EXECUCAO");
  const upcomingMilestones = milestones
    .filter((milestone) => milestone.status !== "CONCLUIDO" && milestone.status !== "CANCELADO")
    .slice(0, 4);
  const criticalIssues = [...openIssues]
    .sort((left, right) => {
      const byPriority = getPriorityRank(right.priority) - getPriorityRank(left.priority);
      if (byPriority !== 0) return byPriority;
      const leftDue = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    })
    .slice(0, 4);
  const criticalRisks = [...activeRisks]
    .sort((left, right) => {
      const byImpact = getRiskImpactRank(right.impact) - getRiskImpactRank(left.impact);
      if (byImpact !== 0) return byImpact;
      const leftReview = left.reviewDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightReview = right.reviewDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftReview - rightReview;
    })
    .slice(0, 4);
  const recentEvents = buildRecentEvents(data);
  const criticalAlerts = criticalIssues.filter((issue) => getPriorityRank(issue.priority) >= 3).length;
  const criticalRiskAlerts =
    criticalRisks.filter((risk) => getRiskImpactRank(risk.impact) >= 3).length;
  const showPavementSnapshot =
    project.technicalAreas.includes("PAVIMENTACAO") || pavementSummary.totalRoadSegments > 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-6">
        <ProjectMetricCard
          label="Situação executiva"
          value={getProjectStatusLabel(project.status)}
          helper={`${getProjectOperationalStatusLabel(project.operationalStatus)} · ${getProjectPriorityLabel(project.priority)}`}
        />
        <ProjectMetricCard
          label="Próximo marco"
          value={upcomingMilestones[0] ? upcomingMilestones[0].title : "Sem marco definido"}
          helper={
            upcomingMilestones[0]
              ? `${formatDateValue(upcomingMilestones[0].targetDate, "Sem data")} · ${getMilestoneStatusLabel(upcomingMilestones[0].status)}`
              : "Cadastre marcos para destacar entregas críticas e checkpoints do projeto."
          }
        />
        <ProjectMetricCard
          label="Pendências críticas"
          value={formatNumber(criticalAlerts + criticalRiskAlerts)}
          helper={`${formatNumber(openIssues.length)} pendência(s) aberta(s) e ${formatNumber(activeRisks.length)} risco(s) ativo(s).`}
        />
        <ProjectMetricCard
          label="Valor contratado"
          value={formatMoney(contractedAmount)}
          helper={
            primaryContract
              ? `${getProjectContractStatusLabel(primaryContract.status)} · ${primaryContract.title}`
              : "Sem contrato detalhado registrado na governança do projeto."
          }
        />
        <ProjectProgressCard
          label="Avanço físico"
          value={physicalProgress}
          helper={`${formatNumber(completedPhases.length)} fase(s) concluída(s) de ${formatNumber(phases.length)}.`}
          tone={physicalProgress >= 75 ? "success" : physicalProgress >= 35 ? "brand" : "warning"}
        />
        <ProjectProgressCard
          label="Avanço financeiro"
          value={financialProgress}
          helper={`${formatNumber(measurementTotals._count._all)} medição(ões) consolidadas no projeto.`}
          tone={
            financialProgress >= 75 ? "success" : financialProgress >= 35 ? "brand" : "warning"
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ProjectSectionCard
          eyebrow="Visão geral"
          title="Leitura rápida para gestão e fiscalização"
          description="Esta aba concentra o que normalmente um secretário, gestor ou fiscal precisa ver primeiro: enquadramento institucional, situação executiva, orçamento, entregas e sinais de risco."
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/app/projetos/${project.id}/planejamento`}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Ver planejamento
              </Link>
              <Link
                href={`/app/projetos/${project.id}/financeiro`}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Ver financeiro
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-border bg-background px-5 py-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resumo executivo</p>
              <h3 className="mt-3 font-display text-2xl font-700 text-foreground">{project.name}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {project.description?.trim() ||
                  "Projeto com cadastro institucional concluído, aguardando detalhamento narrativo da finalidade, escopo e benefícios esperados."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <ProjectBadge label={project.code || "Sem código"} tone="neutral" />
                <ProjectBadge label={getProjectStatusLabel(project.status)} tone="brand" />
                <ProjectBadge
                  label={getProjectOperationalStatusLabel(project.operationalStatus)}
                  tone={getGovernanceTone(project.operationalStatus)}
                />
                <ProjectBadge label={getProjectPriorityLabel(project.priority)} tone="warning" />
                {project.projectType ? (
                  <ProjectBadge label={getProjectTypeLabel(project.projectType)} tone="neutral" />
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SummaryDetailRow
                  label="Secretaria e área"
                  value={project.responsibleDepartment || "Não informada"}
                  helper={project.responsibleArea || "Área responsável não definida."}
                />
                <SummaryDetailRow
                  label="Território"
                  value={locationLabel || "Território não informado"}
                  helper={project.address || project.referencePoint || "Sem endereço ou referência cadastrada."}
                />
                <SummaryDetailRow
                  label="Gestor e fiscal"
                  value={project.manager?.name || "Gestor não definido"}
                  helper={project.inspector?.name ? `Fiscal: ${project.inspector.name}` : "Fiscal não definido."}
                />
                <SummaryDetailRow
                  label="Contratação e transparência"
                  value={contractorLabel || "Empresa não informada"}
                  helper={`${getVisibilityLabel(project.publicVisibility !== "INTERNO")} · Prazo ${formatDateValue(deadline, "não definido")}.`}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-background px-5 py-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Critérios de leitura</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <li>
                    O topo prioriza situação, marcos, pendências e avanço para dar contexto antes da navegação por abas.
                  </li>
                  <li>
                    Itens financeiros usam o valor contratado como referência principal e, quando faltam dados, caem para o consolidado disponível.
                  </li>
                  <li>
                    Pendências e riscos aparecem primeiro quando têm prioridade alta, urgência ou impacto elevado.
                  </li>
                  <li>
                    O contexto espacial só ocupa espaço quando o projeto já tem localização, geometria ou ativos vinculados.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-background px-5 py-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Áreas técnicas</p>
                {project.technicalAreas.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.technicalAreas.map((area) => (
                      <ProjectBadge key={area} label={getProjectTechnicalAreaLabel(area)} tone="success" />
                    ))}
                  </div>
                ) : (
                  <ProjectEmptyBlock
                    title="Sem frentes técnicas mapeadas"
                    description="Associe áreas como drenagem, pavimentação, iluminação ou fiscalização para enriquecer a governança do projeto."
                  />
                )}
              </div>
            </div>
          </div>
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProjectSectionCard
          eyebrow="Planejamento"
          title="Próximos marcos"
          description="Marcos futuros e checkpoints que merecem acompanhamento próximo pela gestão."
          action={
            <Link
              href={`/app/projetos/${project.id}/planejamento`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir planejamento
            </Link>
          }
        >
          {upcomingMilestones.length > 0 ? (
            <div className="space-y-3">
              {upcomingMilestones.map((milestone) => (
                <article key={milestone.id} className="rounded-xl border border-border bg-background px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{milestone.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {milestone.description?.trim() || "Marco sem descrição complementar cadastrada."}
                      </p>
                    </div>
                    <ProjectBadge
                      label={getMilestoneStatusLabel(milestone.status)}
                      tone={getGovernanceTone(milestone.status)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <span>Data alvo: {formatDateValue(milestone.targetDate, "Sem data")}</span>
                    <span>{milestone.phase ? `Fase ${milestone.phase.sequence} · ${milestone.phase.name}` : "Sem fase vinculada"}</span>
                    <span>
                      Responsável: {milestone.responsibleUser?.name || "Não definido"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ProjectEmptyBlock
              title="Nenhum marco futuro definido"
              description="Cadastre marcos para dar previsibilidade a entregas, liberações e eventos decisórios do projeto."
            />
          )}
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Risco e atenção"
          title="Pendências críticas"
          description="Pendências abertas e riscos monitorados que podem afetar prazo, custo, entrega ou conformidade."
          action={
            <Link
              href={`/app/projetos/${project.id}/pendencias-riscos`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir pendências e riscos
            </Link>
          }
        >
          {criticalIssues.length === 0 && criticalRisks.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem alertas críticos agora"
              description="O projeto não possui pendências abertas ou riscos ativos relevantes no momento."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Pendências</h4>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {formatNumber(openIssues.length)} aberta(s)
                  </span>
                </div>
                {criticalIssues.length > 0 ? (
                  criticalIssues.map((issue) => (
                    <article key={issue.id} className="rounded-xl border border-border bg-background px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-semibold text-foreground">{issue.title}</h5>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {issue.description?.trim() || "Pendência sem descrição adicional registrada."}
                          </p>
                        </div>
                        <ProjectBadge
                          label={getProjectIssueStatusLabel(issue.status)}
                          tone={getGovernanceTone(issue.status)}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ProjectBadge label={getProjectIssueTypeLabel(issue.issueType)} tone="neutral" />
                        <ProjectBadge label={getProjectPriorityLabel(issue.priority)} tone="warning" />
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {issue.phase ? `${issue.phase.name} · ` : ""}
                        Prazo {formatDateValue(issue.dueDate, "não definido")}
                        {issue.assignedTo?.name ? ` · Responsável ${issue.assignedTo.name}` : ""}
                      </p>
                    </article>
                  ))
                ) : (
                  <ProjectEmptyBlock
                    title="Sem pendências críticas"
                    description="As pendências abertas atuais não foram classificadas como críticas para esta visão resumida."
                  />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Riscos</h4>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {formatNumber(activeRisks.length)} ativo(s)
                  </span>
                </div>
                {criticalRisks.length > 0 ? (
                  criticalRisks.map((risk) => (
                    <article key={risk.id} className="rounded-xl border border-border bg-background px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-semibold text-foreground">{risk.title}</h5>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {risk.description?.trim() || "Risco sem narrativa complementar cadastrada."}
                          </p>
                        </div>
                        <ProjectBadge
                          label={getProjectRiskStatusLabel(risk.status)}
                          tone={getGovernanceTone(risk.status)}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ProjectBadge label={getProjectRiskCategoryLabel(risk.category)} tone="neutral" />
                        <ProjectBadge label={getProjectRiskImpactLabel(risk.impact)} tone="danger" />
                        <ProjectBadge
                          label={getProjectRiskProbabilityLabel(risk.probability)}
                          tone="warning"
                        />
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {risk.phase ? `${risk.phase.name} · ` : ""}
                        Revisão {formatDateValue(risk.reviewDate, "não definida")}
                        {risk.owner?.name ? ` · Responsável ${risk.owner.name}` : ""}
                      </p>
                    </article>
                  ))
                ) : (
                  <ProjectEmptyBlock
                    title="Sem riscos prioritários"
                    description="Não há riscos ativos com impacto suficiente para destaque imediato nesta visão executiva."
                  />
                )}
              </div>
            </div>
          )}
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProjectSectionCard
          eyebrow="Financeiro"
          title="Resumo financeiro"
          description="Leitura consolidada de contrato, funding e medições para avaliar execução financeira sem sair da ficha do projeto."
          action={
            <Link
              href={`/app/projetos/${project.id}/financeiro`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir financeiro
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ProjectMetricCard
              label="Contratado"
              value={formatMoney(contractedAmount)}
              helper={
                primaryContract?.contractNumber
                  ? `Contrato ${primaryContract.contractNumber}`
                  : "Sem número contratual principal."
              }
            />
            <ProjectMetricCard
              label="Medido"
              value={formatMoney(measuredAmount)}
              helper={
                latestMeasurement
                  ? `Última medição #${latestMeasurement.measurementNumber}`
                  : "Sem medição registrada."
              }
            />
            <ProjectMetricCard
              label="Aprovado"
              value={formatMoney(approvedAmount)}
              helper={`${formatNumber(measurementTotals._count._all)} medição(ões) contabilizadas.`}
            />
            <ProjectMetricCard
              label="Pago"
              value={formatMoney(paidAmount)}
              helper={
                financialProgress > 0
                  ? `${financialProgress}% do contratado.`
                  : "Sem desembolso consolidado ainda."
              }
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SummaryDetailRow
              label="Contrato de referência"
              value={primaryContract?.title || "Sem contrato detalhado"}
              helper={
                primaryContract
                  ? `${getProjectContractStatusLabel(primaryContract.status)} · ${primaryContract.contractorName || "empresa não informada"}`
                  : "Cadastre contratos para rastrear valor, vigência e medição."
              }
            />
            <SummaryDetailRow
              label="Fonte principal"
              value={primaryFundingSource?.sourceName || "Sem fonte de recurso vinculada"}
              helper={
                primaryFundingSource
                  ? `${getFundingSourceTypeLabel(primaryFundingSource.sourceType)} · ${getFundingSourceStatusLabel(primaryFundingSource.status)}`
                  : "Associe funding sources para qualificar a origem do recurso."
              }
            />
          </div>
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Execução"
          title="Resumo físico"
          description="Status das frentes, da entrega física e dos pontos de acompanhamento de campo e fiscalização."
          action={
            <Link
              href={`/app/projetos/${project.id}/fiscalizacao`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir fiscalização
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ProjectProgressCard
              label="Avanço físico do projeto"
              value={physicalProgress}
              helper={`${formatNumber(executionPhases.length)} fase(s) em execução.`}
              tone={physicalProgress >= 75 ? "success" : physicalProgress >= 35 ? "brand" : "warning"}
            />
            <ProjectProgressCard
              label="Avanço financeiro refletido"
              value={financialProgress}
              helper={
                latestInspection
                  ? `Última inspeção ${formatDateValue(
                      latestInspection.occurredAt ?? latestInspection.scheduledAt,
                      "sem data"
                    )}.`
                  : "Sem inspeções registradas."
              }
              tone={
                financialProgress >= 75 ? "success" : financialProgress >= 35 ? "brand" : "warning"
              }
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <SummaryDetailRow
              label="Fases concluídas"
              value={formatNumber(completedPhases.length)}
              helper={`De ${formatNumber(phases.length)} fase(s) cadastrada(s).`}
            />
            <SummaryDetailRow
              label="Fases atrasadas"
              value={formatNumber(delayedPhases.length)}
              helper={delayedPhases[0] ? delayedPhases[0].name : "Sem alerta de atraso nas fases."}
            />
            <SummaryDetailRow
              label="Inspeções"
              value={formatNumber(inspections.length)}
              helper={
                latestInspection
                  ? `${getProjectInspectionTypeLabel(latestInspection.inspectionType)} ${getProjectInspectionStatusLabel(latestInspection.status).toLowerCase()}`
                  : "Sem inspeções registradas."
              }
            />
            <SummaryDetailRow
              label="Documentos técnicos"
              value={formatNumber(documents.length)}
              helper={`${formatNumber(documents.filter((document) => document.isPublic).length)} público(s).`}
            />
          </div>

          {delayedPhases.length > 0 ? (
            <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 px-4 py-4">
              <p className="text-sm font-semibold text-warning-800">Fases que pedem atenção imediata</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {delayedPhases.slice(0, 4).map((phase) => (
                  <ProjectBadge
                    key={phase.id}
                    label={`${phase.name} · ${formatDateValue(phase.plannedEndDate, "sem prazo")}`}
                    tone="warning"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {showPavementSnapshot ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Leitura rápida de pavimentação</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Resumo automático dos trechos viários cadastrados no mapa do projeto.
                  </p>
                </div>
                <Link
                  href={`/app/projetos/${project.id}/mapa`}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Abrir mapa
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <SummaryDetailRow
                  label="Trechos viários"
                  value={formatNumber(pavementSummary.totalRoadSegments)}
                  helper={`${formatNumber(pavementSummary.criticalSegments)} crítico(s).`}
                />
                <SummaryDetailRow
                  label="Extensão total"
                  value={formatDistance(pavementSummary.totalLengthMeters)}
                  helper="Comprimento consolidado dos trechos cadastrados."
                />
                <SummaryDetailRow
                  label="Área estimada"
                  value={`${formatNumber(pavementSummary.totalAreaSqm)} m²`}
                  helper="Calculada automaticamente a partir do comprimento e da largura efetiva."
                />
                <SummaryDetailRow
                  label="Custo estimado"
                  value={formatMoney(pavementSummary.totalEstimatedCost || null)}
                  helper="Soma dos custos estimados por m² dos trechos viários."
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(pavementSummary.conditionCounts)
                  .filter(([, count]) => count > 0)
                  .map(([condition, count]) => (
                    <ProjectBadge
                      key={condition}
                      label={`${formatEnumLabel(condition)} · ${formatNumber(count)}`}
                      tone={condition === "CRITICA" ? "danger" : condition === "RUIM" ? "warning" : "neutral"}
                    />
                  ))}
              </div>
            </div>
          ) : null}
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProjectSectionCard
          eyebrow="Histórico"
          title="Últimos eventos do projeto"
          description="Feed resumido combinando comentários, auditoria, medições e fiscalizações mais recentes."
          action={
            <Link
              href={`/app/projetos/${project.id}/historico`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir histórico completo
            </Link>
          }
        >
          {recentEvents.length > 0 ? (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <SummaryEventItem key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <ProjectEmptyBlock
              title="Sem eventos recentes"
              description="Comentários, auditoria, inspeções e medições passarão a aparecer aqui conforme o projeto for operado."
            />
          )}
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Mapa e território"
          title="Contexto espacial resumido"
          description="Leitura territorial rápida para saber se o projeto já está posicionado no espaço e que ativos estão vinculados ao mapa."
          action={
            <Link
              href={`/app/projetos/${project.id}/mapa`}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
            >
              Abrir mapa/GIS
            </Link>
          }
        >
          {locationLabel || project.geomWkt || totalAssets > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryDetailRow
                  label="Território principal"
                  value={locationLabel || "Não delimitado"}
                  helper={project.address || project.referencePoint || "Sem endereço ou ponto de referência."}
                />
                <SummaryDetailRow
                  label="Cobertura cartográfica"
                  value={project.geomWkt ? "Geometria principal registrada" : "Sem geometria principal"}
                  helper={
                    totalAssets > 0
                      ? `${formatNumber(totalAssets)} ativo(s) GIS vinculados ao projeto.`
                      : "Sem ativos GIS vinculados até o momento."
                  }
                />
              </div>

              {assetGroups.length > 0 ? (
                <div className="rounded-2xl border border-border bg-background px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Distribuição de ativos por tipo</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {formatNumber(totalAssets)} ativo(s)
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {assetGroups
                      .slice()
                      .sort((left, right) => right._count._all - left._count._all)
                      .map((group) => {
                        const percentage =
                          totalAssets > 0 ? Math.round((group._count._all / totalAssets) * 100) : 0;
                        return (
                          <div key={group.type}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-foreground">{formatEnumLabel(group.type)}</span>
                              <span className="text-muted-foreground">
                                {formatNumber(group._count._all)} · {percentage}%
                              </span>
                            </div>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-brand-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}

              {recentAssets.length > 0 ? (
                <div className="rounded-2xl border border-border bg-background px-5 py-5">
                  <p className="text-sm font-semibold text-foreground">Ativos mais recentes</p>
                  <div className="mt-4 space-y-3">
                    {recentAssets.slice(0, 4).map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{asset.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {formatEnumLabel(asset.type)}
                          </p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {formatDate(asset.updatedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <ProjectEmptyBlock
              title="Sem contexto espacial suficiente"
              description="A ficha ainda não tem geometria, território qualificado ou ativos GIS para compor este resumo espacial."
            />
          )}
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ProjectMetricCard
          label="Comentários"
          value={formatNumber(comments.length)}
          helper="Entradas mais recentes do acompanhamento operacional do projeto."
        />
        <ProjectMetricCard
          label="Auditorias relacionadas"
          value={formatNumber(auditLogs.length)}
          helper="Eventos de trilha operacional ligados ao projeto ou aos seus desdobramentos."
        />
        <ProjectMetricCard
          label="Documentos públicos"
          value={formatNumber(documents.filter((document) => document.isPublic).length)}
          helper="Materiais que já podem compor transparência ativa ou visão pública do projeto."
        />
      </section>
    </div>
  );
}
