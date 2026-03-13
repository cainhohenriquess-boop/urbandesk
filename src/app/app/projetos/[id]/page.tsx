import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectProgressCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import {
  getProjectOverviewData,
  resolveProjectContractedAmount,
  resolveProjectFinancialProgress,
  resolveProjectMeasuredAmount,
  resolveProjectPaidAmount,
  resolveProjectPhysicalProgress,
} from "@/lib/project-detail-data";
import {
  getGovernanceTone,
  getProjectContractStatusLabel,
  getProjectDocumentTypeLabel,
  getProjectInspectionStatusLabel,
  getProjectInspectionTypeLabel,
  getProjectIssueStatusLabel,
  getProjectIssueTypeLabel,
  getProjectMeasurementStatusLabel,
  getProjectOperationalStatusLabel,
  getProjectRiskCategoryLabel,
  getProjectRiskProbabilityLabel,
  getProjectRiskStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import {
  getProjectPriorityLabel,
  getProjectStatusLabel,
  getProjectTypeLabel,
} from "@/lib/project-portfolio";
import { formatBRL, formatDate, formatDateTime, formatNumber } from "@/lib/utils";

type ProjetoPageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "Não informado" : formatBRL(value);
}

function formatDateValue(value: Date | string | null | undefined) {
  return value ? formatDate(value) : "Não informado";
}

function isOpenIssue(status: string) {
  return status === "ABERTA" || status === "EM_TRATATIVA";
}

function isActiveRisk(status: string) {
  return status !== "ENCERRADO";
}

function isDelayedPhase(phase: {
  status: string;
  plannedEndDate: Date | null;
}) {
  if (!phase.plannedEndDate) return false;
  if (phase.status === "CONCLUIDA" || phase.status === "CANCELADA") return false;
  return phase.plannedEndDate.getTime() < Date.now();
}

function commentContextLabel(comment: {
  phase?: { name: string } | null;
  milestone?: { title: string } | null;
  measurement?: { measurementNumber: number } | null;
  inspection?: { inspectionType: string } | null;
  issue?: { title: string } | null;
  risk?: { title: string } | null;
}) {
  if (comment.issue) return `Pendência: ${comment.issue.title}`;
  if (comment.risk) return `Risco: ${comment.risk.title}`;
  if (comment.inspection) {
    return `Fiscalização ${getProjectInspectionTypeLabel(comment.inspection.inspectionType as never)}`;
  }
  if (comment.measurement) return `Medição #${comment.measurement.measurementNumber}`;
  if (comment.milestone) return `Marco: ${comment.milestone.title}`;
  if (comment.phase) return `Fase: ${comment.phase.name}`;
  return "Projeto";
}

export default async function Projeto360Page({ params }: ProjetoPageProps) {
  const { id } = await params;
  const data = await getProjectOverviewData(id);

  if (!data) {
    notFound();
  }

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
  } = data;

  const contractedAmount = resolveProjectContractedAmount(project);
  const measuredAmount =
    resolveProjectMeasuredAmount(project) ??
    (measurementTotals._sum.measuredAmount
      ? Number(measurementTotals._sum.measuredAmount)
      : null);
  const paidAmount =
    resolveProjectPaidAmount(project) ??
    (measurementTotals._sum.paidAmount ? Number(measurementTotals._sum.paidAmount) : null);
  const approvedAmount = measurementTotals._sum.approvedAmount
    ? Number(measurementTotals._sum.approvedAmount)
    : null;
  const physicalProgress = resolveProjectPhysicalProgress(project);
  const financialProgress = resolveProjectFinancialProgress(project);
  const openIssues = issues.filter((issue) => isOpenIssue(issue.status));
  const activeRisks = risks.filter((risk) => isActiveRisk(risk.status));
  const delayedPhases = phases.filter((phase) => isDelayedPhase(phase));
  const publicDocuments = documents.filter((document) => document.isPublic);
  const nextMilestone = milestones.find(
    (milestone) => milestone.status !== "CONCLUIDO" && milestone.status !== "CANCELADO"
  );
  const documentTypeSummary = Array.from(
    documents.reduce((acc, document) => {
      acc.set(document.documentType, (acc.get(document.documentType) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Contratos"
          value={formatNumber(project._count.contracts)}
          helper={
            contracts[0]
              ? `Mais recente: ${contracts[0].title}`
              : "Ainda não há contrato detalhado cadastrado."
          }
        />
        <ProjectMetricCard
          label="Pendências abertas"
          value={formatNumber(openIssues.length)}
          helper={`${formatNumber(activeRisks.length)} risco(s) ativo(s) monitorado(s).`}
        />
        <ProjectMetricCard
          label="Marcos em aberto"
          value={formatNumber(
            milestones.filter((item) => item.status !== "CONCLUIDO").length
          )}
          helper={
            nextMilestone
              ? `Próximo marco em ${formatDateValue(nextMilestone.targetDate)}.`
              : "Sem marco futuro definido."
          }
        />
        <ProjectMetricCard
          label="Documentos públicos"
          value={formatNumber(publicDocuments.length)}
          helper={`${formatNumber(project._count.documents)} documento(s) vinculados ao projeto.`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProjectSectionCard
          eyebrow="Resumo"
          title="Contexto institucional e executivo"
          description="A Ficha 360º consolida as principais informações administrativas, territoriais e operacionais do projeto em um só lugar."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Institucional
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Código</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.code || "Não informado"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Secretaria</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.responsibleDepartment || "Não informada"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Área responsável</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.responsibleArea || "Não informada"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.projectType ? getProjectTypeLabel(project.projectType) : "Não informado"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Status operacional</dt>
                  <dd className="text-right font-medium text-foreground">
                    {getProjectOperationalStatusLabel(project.operationalStatus)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Prioridade / criticidade</dt>
                  <dd className="text-right font-medium text-foreground">
                    {getProjectPriorityLabel(project.priority)} · {project.criticality.toLowerCase()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Territorial e contratual
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Bairro</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.neighborhood || "Não informado"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Região / distrito</dt>
                  <dd className="text-right font-medium text-foreground">
                    {[project.region, project.district].filter(Boolean).join(" · ") || "Não informado"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Endereço</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.address || "Não informado"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Empresa contratada</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.contractorName || contracts[0]?.contractorName || "Não informada"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Processo / contrato</dt>
                  <dd className="text-right font-medium text-foreground">
                    {[project.procurementProcess, project.contractNumber]
                      .filter(Boolean)
                      .join(" · ") || "Não informado"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Áreas técnicas</dt>
                  <dd className="text-right font-medium text-foreground">
                    {project.technicalAreas.length > 0
                      ? project.technicalAreas.map(getProjectTechnicalAreaLabel).join(", ")
                      : "Não definidas"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Governança"
          title="Responsáveis e execução"
          description="Síntese dos responsáveis, do cronograma e da execução financeira do projeto."
        >
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProjectMetricCard
                label="Gestor responsável"
                value={project.manager?.name || "Não definido"}
                helper={project.manager?.email || "Defina um gestor para responsabilização do projeto."}
              />
              <ProjectMetricCard
                label="Fiscal responsável"
                value={project.inspector?.name || "Não definido"}
                helper={
                  project.inspector?.email ||
                  "A fiscalização pode ser vinculada no cadastro do projeto."
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ProjectProgressCard
                label="Avanço físico"
                value={physicalProgress}
                helper={`Status atual: ${getProjectStatusLabel(project.status)}`}
                tone="brand"
              />
              <ProjectProgressCard
                label="Avanço financeiro"
                value={financialProgress}
                helper={`Pago ${formatMoney(paidAmount)} de ${formatMoney(contractedAmount)}.`}
                tone={financialProgress >= 75 ? "success" : financialProgress >= 35 ? "brand" : "warning"}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ProjectMetricCard
                label="Planejado"
                value={`${formatDateValue(project.plannedStartDate)} → ${formatDateValue(
                  project.plannedEndDate
                )}`}
              />
              <ProjectMetricCard
                label="Real"
                value={`${formatDateValue(project.actualStartDate)} → ${formatDateValue(
                  project.actualEndDate
                )}`}
              />
              <ProjectMetricCard
                label="Valor contratado"
                value={formatMoney(contractedAmount)}
                helper={`Medido ${formatMoney(measuredAmount)} · Pago ${formatMoney(paidAmount)}`}
              />
            </div>
          </div>
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProjectSectionCard
          eyebrow="Planejamento"
          title="Fases e marcos"
          description="Acompanhe o cronograma em nível de fase e os marcos principais do projeto."
          action={
            <Link
              href={`/app/projetos/${project.id}/planejamento`}
              className="text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Abrir planejamento
            </Link>
          }
        >
          {phases.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem fases detalhadas"
              description="Cadastre fases para estruturar o planejamento e dar visibilidade ao avanço por frente de trabalho."
            />
          ) : (
            <div className="space-y-3">
              {phases.slice(0, 5).map((phase) => (
                <article
                  key={phase.id}
                  className="rounded-xl border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Fase {phase.sequence}
                      </p>
                      <h4 className="mt-1 text-sm font-semibold text-foreground">
                        {phase.name}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {phase.technicalArea
                          ? getProjectTechnicalAreaLabel(phase.technicalArea)
                          : "Sem área técnica definida"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ProjectBadge
                        label={phase.status.toLowerCase().replaceAll("_", " ")}
                        tone={getGovernanceTone(phase.status)}
                      />
                      {isDelayedPhase(phase) ? (
                        <ProjectBadge label="Prazo crítico" tone="danger" />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Prazo
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatDateValue(phase.plannedStartDate)} → {formatDateValue(phase.plannedEndDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Responsável
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {phase.owner?.name || "Não definido"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Avanço físico
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {phase.physicalProgressPct}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Evidências
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatNumber(
                          phase._count.measurements +
                            phase._count.documents +
                            phase._count.inspections
                        )}{" "}
                        registro(s)
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-border bg-background px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">Marcos prioritários</h4>
              <span className="text-xs text-muted-foreground">
                {formatNumber(delayedPhases.length)} fase(s) com prazo crítico
              </span>
            </div>
            {milestones.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Ainda não há marcos definidos para acompanhamento executivo.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {milestones.slice(0, 4).map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex flex-wrap items-start justify-between gap-3 border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{milestone.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {milestone.phase
                          ? `Fase ${milestone.phase.sequence} · ${milestone.phase.name}`
                          : "Marco geral do projeto"}
                      </p>
                    </div>
                    <div className="text-right">
                      <ProjectBadge
                        label={milestone.status.toLowerCase().replaceAll("_", " ")}
                        tone={getGovernanceTone(milestone.status)}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Meta {formatDateValue(milestone.targetDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Financeiro"
          title="Contratos, fontes e orçamento"
          description="Acompanhe a consolidação financeira do projeto a partir do cadastro principal, contratos e medições."
          action={
            <Link
              href={`/app/projetos/${project.id}/financeiro`}
              className="text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Abrir financeiro
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProjectMetricCard
              label="Orçamento estimado"
              value={formatMoney(project.estimatedBudget ? Number(project.estimatedBudget) : project.budget ? Number(project.budget) : null)}
            />
            <ProjectMetricCard
              label="Medido / aprovado"
              value={`${formatMoney(measuredAmount)} · ${formatMoney(approvedAmount)}`}
              helper={`${formatNumber(measurementTotals._count._all)} medição(ões) consolidadas.`}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              {contracts.length === 0 ? (
                <ProjectEmptyBlock
                  title="Sem contratos detalhados"
                  description="Os dados financeiros básicos do projeto já aparecem no cabeçalho, mas os contratos ainda não foram detalhados."
                />
              ) : (
                contracts.slice(0, 3).map((contract) => (
                  <article
                    key={contract.id}
                    className="rounded-xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{contract.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {contract.contractNumber || "Sem número de contrato"}
                        </p>
                      </div>
                      <ProjectBadge
                        label={getProjectContractStatusLabel(contract.status)}
                        tone={getGovernanceTone(contract.status)}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Contratada
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {contract.contractorName || "Não informada"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Valor
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {formatMoney(contract.contractedAmount ? Number(contract.contractedAmount) : null)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Fontes de recurso</h4>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(fundingSources.length)} fonte(s)
                </span>
              </div>
              {fundingSources.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma fonte de recurso detalhada no projeto.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {fundingSources.slice(0, 4).map((source) => (
                    <div
                      key={source.id}
                      className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {source.sourceName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {source.sourceType.toLowerCase().replaceAll("_", " ")}
                          </p>
                        </div>
                        {source.isPrimary ? (
                          <ProjectBadge label="Principal" tone="brand" />
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Planejado {formatMoney(source.plannedAmount ? Number(source.plannedAmount) : null)} · Liberado{" "}
                        {formatMoney(source.releasedAmount ? Number(source.releasedAmount) : null)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ProjectSectionCard
          eyebrow="Documentos e medições"
          title="Evidências administrativas e execução"
          description="Use esta visão para conferir documentação recente, medições lançadas e a trilha de execução do contrato."
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/app/projetos/${project.id}/documentos`}
                className="text-sm font-semibold text-brand-700 hover:text-brand-600"
              >
                Documentos
              </Link>
              <Link
                href={`/app/projetos/${project.id}/medicoes`}
                className="text-sm font-semibold text-brand-700 hover:text-brand-600"
              >
                Medições
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Documentos recentes</h4>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(project._count.documents)} no total
                </span>
              </div>
              {documents.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  O projeto ainda não possui documentos vinculados.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {documents.slice(0, 5).map((document) => (
                    <div
                      key={document.id}
                      className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{document.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getProjectDocumentTypeLabel(document.documentType)} ·{" "}
                            {document.fileName}
                          </p>
                        </div>
                        {document.isPublic ? (
                          <ProjectBadge label="Público" tone="success" />
                        ) : (
                          <ProjectBadge label="Interno" tone="neutral" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {document.uploadedBy?.name || "Sem autor"} ·{" "}
                        {formatDateValue(document.documentDate || document.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {documentTypeSummary.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {documentTypeSummary.map(([type, count]) => (
                    <ProjectBadge
                      key={type}
                      label={`${getProjectDocumentTypeLabel(type as never)} · ${count}`}
                      tone="neutral"
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Medições recentes</h4>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(measurements.length)} carregada(s)
                </span>
              </div>
              {measurements.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma medição lançada para este projeto.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {measurements.slice(0, 5).map((measurement) => (
                    <div
                      key={measurement.id}
                      className="rounded-xl border border-border/80 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Medição #{measurement.measurementNumber}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {measurement.phase
                              ? `Fase ${measurement.phase.sequence} · ${measurement.phase.name}`
                              : "Projeto geral"}
                          </p>
                        </div>
                        <ProjectBadge
                          label={getProjectMeasurementStatusLabel(measurement.status)}
                          tone={getGovernanceTone(measurement.status)}
                        />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Referência
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {formatDateValue(measurement.referenceMonth)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Valor medido
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {formatMoney(measurement.measuredAmount ? Number(measurement.measuredAmount) : null)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Avanço físico
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {measurement.physicalProgressPct}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Mapa e território"
          title="Ativos GIS e frente territorial"
          description="O GIS continua sendo uma frente importante do projeto, agora integrado à gestão e não mais como único centro do módulo."
          action={
            <Link
              href={`/app/projetos/${project.id}/mapa`}
              className="text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Abrir workspace cartográfico
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Ativos por tipo</h4>
                <span className="text-xs text-muted-foreground">
                  {project.geomWkt ? "Geometria principal informada" : "Sem geometria principal"}
                </span>
              </div>
              {assetGroups.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ainda não há ativos vinculados ao projeto.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {assetGroups.map((group) => (
                    <div
                      key={group.type}
                      className="flex items-center justify-between rounded-xl border border-border/80 px-3 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">{group.type}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatNumber(group._count._all)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Ativos recentes</h4>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(project._count.assets)} no total
                </span>
              </div>
              {recentAssets.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  O mapa ainda não recebeu atualizações recentes.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {recentAssets.slice(0, 5).map((asset) => (
                    <div
                      key={asset.id}
                      className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{asset.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{asset.type}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(asset.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ProjectSectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ProjectSectionCard
          eyebrow="Fiscalização"
          title="Inspeções, pendências e riscos"
          description="Monitore o que foi fiscalizado, o que está pendente e os riscos que exigem tratamento."
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/app/projetos/${project.id}/fiscalizacao`}
                className="text-sm font-semibold text-brand-700 hover:text-brand-600"
              >
                Fiscalização
              </Link>
              <Link
                href={`/app/projetos/${project.id}/pendencias-riscos`}
                className="text-sm font-semibold text-brand-700 hover:text-brand-600"
              >
                Pendências/Riscos
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <h4 className="text-sm font-semibold text-foreground">Fiscalizações recentes</h4>
              {inspections.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma fiscalização foi registrada até o momento.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {inspections.slice(0, 4).map((inspection) => (
                    <div
                      key={inspection.id}
                      className="rounded-xl border border-border/80 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {getProjectInspectionTypeLabel(inspection.inspectionType)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {inspection.phase
                              ? `Fase ${inspection.phase.sequence} · ${inspection.phase.name}`
                              : inspection.location || "Projeto"}
                          </p>
                        </div>
                        <ProjectBadge
                          label={getProjectInspectionStatusLabel(inspection.status)}
                          tone={getGovernanceTone(inspection.status)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateValue(inspection.occurredAt || inspection.scheduledAt)} ·{" "}
                        {inspection.inspector?.name || "Sem fiscal atribuído"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-foreground">Pendências abertas</h4>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(openIssues.length)}
                  </span>
                </div>
                {openIssues.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sem pendências abertas neste momento.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {openIssues.slice(0, 3).map((issue) => (
                      <div key={issue.id} className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{issue.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {getProjectIssueTypeLabel(issue.issueType)} ·{" "}
                              {issue.assignedTo?.name || "Sem responsável"}
                            </p>
                          </div>
                          <ProjectBadge
                            label={getProjectIssueStatusLabel(issue.status)}
                            tone={getGovernanceTone(issue.status)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-foreground">Riscos ativos</h4>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(activeRisks.length)}
                  </span>
                </div>
                {activeRisks.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhum risco ativo cadastrado.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {activeRisks.slice(0, 3).map((risk) => (
                      <div key={risk.id} className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{risk.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {getProjectRiskCategoryLabel(risk.category)} ·{" "}
                              {getProjectRiskProbabilityLabel(risk.probability)} probabilidade
                            </p>
                          </div>
                          <ProjectBadge
                            label={getProjectRiskStatusLabel(risk.status)}
                            tone={getGovernanceTone(risk.status)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Histórico"
          title="Comentários e trilha recente"
          description="Histórico operacional do projeto, incluindo comentários de equipe e trilha de auditoria do sistema."
          action={
            <Link
              href={`/app/projetos/${project.id}/historico`}
              className="text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Abrir histórico
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <h4 className="text-sm font-semibold text-foreground">Comentários recentes</h4>
              {comments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ainda não existem comentários vinculados ao projeto.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {comments.slice(0, 4).map((comment) => (
                    <article
                      key={comment.id}
                      className="rounded-xl border border-border/80 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {comment.author?.name || "Equipe"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {commentContextLabel(comment)}
                          </p>
                        </div>
                        <ProjectBadge
                          label={comment.isInternal ? "Interno" : "Compartilhável"}
                          tone={comment.isInternal ? "neutral" : "success"}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">{comment.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <h4 className="text-sm font-semibold text-foreground">Auditoria recente</h4>
              {auditLogs.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ainda não há eventos de auditoria associados ao projeto.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.action}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {log.userName || log.userEmail || "Sistema"} ·{" "}
                            {log.entityType || "evento"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ProjectSectionCard>
      </section>
    </div>
  );
}
