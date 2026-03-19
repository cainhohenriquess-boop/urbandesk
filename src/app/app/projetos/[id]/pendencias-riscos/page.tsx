import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getProjectIssuesAndRisksData } from "@/lib/project-detail-data";
import {
  getGovernanceTone,
  getProjectIssueStatusLabel,
  getProjectIssueTypeLabel,
  getProjectRiskCategoryLabel,
  getProjectRiskImpactLabel,
  getProjectRiskProbabilityLabel,
  getProjectRiskStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { getTechnicalObjectLabel, isTechnicalObjectType } from "@/lib/project-disciplines";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoPendenciasRiscosPageProps = {
  params: Promise<{ id: string }>;
};

function getTechnicalObjectSummary(value: string | null | undefined) {
  return value && isTechnicalObjectType(value) ? getTechnicalObjectLabel(value) : "Não informado";
}

function getIssueSource(issue: { metadata?: unknown; inspection?: { id: string } | null }) {
  if (issue.inspection) return "Fiscalização";
  if (!issue.metadata || typeof issue.metadata !== "object" || Array.isArray(issue.metadata)) {
    return "Projeto";
  }
  return (issue.metadata as { source?: unknown }).source === "campo" ? "Campo" : "Projeto";
}

export default async function ProjetoPendenciasRiscosPage({ params }: ProjetoPendenciasRiscosPageProps) {
  const { id } = await params;
  const data = await getProjectIssuesAndRisksData(id);

  if (!data) notFound();

  const { issues, risks } = data;
  const openIssues = issues.filter((item) => item.status === "ABERTA" || item.status === "EM_TRATATIVA");
  const activeRisks = risks.filter((item) => item.status !== "ENCERRADO");
  const fieldIssues = issues.filter((item) => getIssueSource(item) === "Campo").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-5">
        <ProjectMetricCard label="Pendências" value={formatNumber(issues.length)} helper="Todas as pendências registradas no projeto." />
        <ProjectMetricCard label="Abertas" value={formatNumber(openIssues.length)} helper="Pendências ainda em tratamento." />
        <ProjectMetricCard label="Vindas do campo" value={formatNumber(fieldIssues)} helper="Ocorrências registradas no app de campo." />
        <ProjectMetricCard label="Riscos" value={formatNumber(risks.length)} helper="Riscos mapeados no projeto." />
        <ProjectMetricCard label="Riscos ativos" value={formatNumber(activeRisks.length)} helper="Riscos ainda sob monitoramento." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ProjectSectionCard eyebrow="Pendências" title="Pendências e bloqueios" description="Itens de prazo, qualidade, documentação ou execução que exigem tratamento.">
          {issues.length === 0 ? (
            <ProjectEmptyBlock title="Sem pendências registradas" description="As pendências do projeto aparecerão aqui com prioridade, área técnica, ativo relacionado e prazo." />
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <article key={issue.id} className="rounded-xl border border-border bg-background px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{issue.title}</p>
                        {issue.technicalArea && <ProjectBadge label={getProjectTechnicalAreaLabel(issue.technicalArea)} tone="neutral" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{getProjectIssueTypeLabel(issue.issueType)} · {issue.priority.toLowerCase()}</p>
                    </div>
                    <ProjectBadge label={getProjectIssueStatusLabel(issue.status)} tone={getGovernanceTone(issue.status)} />
                  </div>

                  <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prazo</p>
                      <p className="mt-1 font-medium text-foreground">{issue.dueDate ? formatDate(issue.dueDate) : "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Responsável</p>
                      <p className="mt-1 font-medium text-foreground">{issue.assignedTo?.name || "Não definido"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Origem</p>
                      <p className="mt-1 font-medium text-foreground">{getIssueSource(issue)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Reportado por</p>
                      <p className="mt-1 font-medium text-foreground">{issue.reportedBy?.name || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Área técnica</p>
                      <p className="mt-1 font-medium text-foreground">{issue.technicalArea ? getProjectTechnicalAreaLabel(issue.technicalArea) : "Não informada"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Objeto técnico</p>
                      <p className="mt-1 font-medium text-foreground">{getTechnicalObjectSummary(issue.technicalObjectType)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ativo relacionado</p>
                      <p className="mt-1 font-medium text-foreground">{issue.asset?.name || "Sem vínculo direto"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ProjectSectionCard>

        <ProjectSectionCard eyebrow="Riscos" title="Riscos monitorados" description="Riscos estratégicos e operacionais acompanhados no projeto.">
          {risks.length === 0 ? (
            <ProjectEmptyBlock title="Sem riscos cadastrados" description="Os riscos do projeto aparecerão aqui com categoria, probabilidade, impacto e responsável." />
          ) : (
            <div className="space-y-3">
              {risks.map((risk) => (
                <article key={risk.id} className="rounded-xl border border-border bg-background px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{getProjectRiskCategoryLabel(risk.category)}</p>
                    </div>
                    <ProjectBadge label={getProjectRiskStatusLabel(risk.status)} tone={getGovernanceTone(risk.status)} />
                  </div>
                  <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Probabilidade</p>
                      <p className="mt-1 font-medium text-foreground">{getProjectRiskProbabilityLabel(risk.probability)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Impacto</p>
                      <p className="mt-1 font-medium text-foreground">{getProjectRiskImpactLabel(risk.impact)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Revisão</p>
                      <p className="mt-1 font-medium text-foreground">{risk.reviewDate ? formatDate(risk.reviewDate) : "Não informada"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Responsável</p>
                      <p className="mt-1 font-medium text-foreground">{risk.owner?.name || "Não definido"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ProjectSectionCard>
      </section>
    </div>
  );
}
