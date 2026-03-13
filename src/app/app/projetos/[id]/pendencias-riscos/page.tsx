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
} from "@/lib/project-labels";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoPendenciasRiscosPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoPendenciasRiscosPage({
  params,
}: ProjetoPendenciasRiscosPageProps) {
  const { id } = await params;
  const data = await getProjectIssuesAndRisksData(id);

  if (!data) {
    notFound();
  }

  const { issues, risks } = data;
  const openIssues = issues.filter((item) =>
    item.status === "ABERTA" || item.status === "EM_TRATATIVA"
  );
  const activeRisks = risks.filter((item) => item.status !== "ENCERRADO");

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Pendências"
          value={formatNumber(issues.length)}
          helper="Todas as pendências registradas no projeto."
        />
        <ProjectMetricCard
          label="Abertas"
          value={formatNumber(openIssues.length)}
          helper="Pendências ainda em tratamento."
        />
        <ProjectMetricCard
          label="Riscos"
          value={formatNumber(risks.length)}
          helper="Riscos mapeados no projeto."
        />
        <ProjectMetricCard
          label="Riscos ativos"
          value={formatNumber(activeRisks.length)}
          helper="Riscos ainda sob monitoramento."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ProjectSectionCard
          eyebrow="Pendências"
          title="Pendências e bloqueios"
          description="Itens de prazo, qualidade, documentação ou execução que exigem tratamento."
        >
          {issues.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem pendências registradas"
              description="As pendências do projeto aparecerão aqui com prioridade, responsável e prazo."
            />
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-xl border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{issue.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getProjectIssueTypeLabel(issue.issueType)} · {issue.priority.toLowerCase()}
                      </p>
                    </div>
                    <ProjectBadge
                      label={getProjectIssueStatusLabel(issue.status)}
                      tone={getGovernanceTone(issue.status)}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Prazo
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {issue.dueDate ? formatDate(issue.dueDate) : "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Responsável
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {issue.assignedTo?.name || "Não definido"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Origem
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {issue.inspection ? "Fiscalização" : issue.asset ? issue.asset.name : "Projeto"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Reportado por
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {issue.reportedBy?.name || "Não informado"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Riscos"
          title="Riscos monitorados"
          description="Riscos estratégicos e operacionais acompanhados no projeto."
        >
          {risks.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem riscos cadastrados"
              description="Os riscos do projeto aparecerão aqui com categoria, probabilidade, impacto e responsável."
            />
          ) : (
            <div className="space-y-3">
              {risks.map((risk) => (
                <article
                  key={risk.id}
                  className="rounded-xl border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getProjectRiskCategoryLabel(risk.category)}
                      </p>
                    </div>
                    <ProjectBadge
                      label={getProjectRiskStatusLabel(risk.status)}
                      tone={getGovernanceTone(risk.status)}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Probabilidade
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {getProjectRiskProbabilityLabel(risk.probability)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Impacto
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {getProjectRiskImpactLabel(risk.impact)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Revisão
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {risk.reviewDate ? formatDate(risk.reviewDate) : "Não informada"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Responsável
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {risk.owner?.name || "Não definido"}
                      </p>
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
