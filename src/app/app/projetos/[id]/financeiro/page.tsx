import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectProgressCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import {
  getProjectFinancialData,
  resolveProjectContractedAmount,
  resolveProjectFinancialProgress,
  resolveProjectMeasuredAmount,
  resolveProjectPaidAmount,
} from "@/lib/project-detail-data";
import { getGovernanceTone, getProjectContractStatusLabel } from "@/lib/project-labels";
import { formatBRL, formatDate, formatNumber } from "@/lib/utils";

type ProjetoFinanceiroPageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "Não informado" : formatBRL(value);
}

export default async function ProjetoFinanceiroPage({
  params,
}: ProjetoFinanceiroPageProps) {
  const { id } = await params;
  const data = await getProjectFinancialData(id);

  if (!data) {
    notFound();
  }

  const { project, contracts, fundingSources, measurementTotals } = data;
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
  const financialProgress = resolveProjectFinancialProgress(project);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Valor contratado"
          value={formatMoney(contractedAmount)}
          helper="Consolidado do projeto e do contrato de referência."
        />
        <ProjectMetricCard
          label="Valor medido"
          value={formatMoney(measuredAmount)}
          helper={`${formatNumber(measurementTotals._count._all)} medição(ões) associadas.`}
        />
        <ProjectMetricCard
          label="Valor aprovado"
          value={formatMoney(approvedAmount)}
          helper="Montante já aprovado para processamento."
        />
        <ProjectProgressCard
          label="Avanço financeiro"
          value={financialProgress}
          helper={`Pago ${formatMoney(paidAmount)} do total contratado.`}
          tone={financialProgress >= 75 ? "success" : financialProgress >= 35 ? "brand" : "warning"}
        />
      </section>

      <ProjectSectionCard
        eyebrow="Contratos"
        title="Contratos e execução contratual"
        description="Visão dos contratos vinculados ao projeto, com valores, situação e vigência."
      >
        {contracts.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem contratos detalhados"
            description="O cadastro principal do projeto já suporta valores agregados, mas a execução contratual ainda não foi detalhada."
          />
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <article
                key={contract.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{contract.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contract.contractNumber || "Sem número"} ·{" "}
                      {contract.contractorName || "Contratada não informada"}
                    </p>
                  </div>
                  <ProjectBadge
                    label={getProjectContractStatusLabel(contract.status)}
                    tone={getGovernanceTone(contract.status)}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Assinado em
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {contract.signedAt ? formatDate(contract.signedAt) : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Vigência
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {(contract.startDate ? formatDate(contract.startDate) : "Não informado")} →{" "}
                      {(contract.endDate ? formatDate(contract.endDate) : "Não informado")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Contratado
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(contract.contractedAmount ? Number(contract.contractedAmount) : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Pago
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(contract.paidAmount ? Number(contract.paidAmount) : null)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>

      <ProjectSectionCard
        eyebrow="Recursos"
        title="Fontes de financiamento"
        description="Controle de origem do recurso, valores planejados e liberações do projeto."
      >
        {fundingSources.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem fontes de recurso cadastradas"
            description="Cadastre as fontes de financiamento para dar rastreabilidade financeira ao projeto."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {fundingSources.map((source) => (
              <article
                key={source.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{source.sourceName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {source.sourceType.toLowerCase().replaceAll("_", " ")}
                    </p>
                  </div>
                  {source.isPrimary ? (
                    <ProjectBadge label="Principal" tone="brand" />
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Planejado
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(source.plannedAmount ? Number(source.plannedAmount) : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Liberado
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(source.releasedAmount ? Number(source.releasedAmount) : null)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>
    </div>
  );
}
