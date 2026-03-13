import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getProjectMeasurementsData } from "@/lib/project-detail-data";
import { getGovernanceTone, getProjectMeasurementStatusLabel } from "@/lib/project-labels";
import { formatBRL, formatDate, formatNumber } from "@/lib/utils";

type ProjetoMedicoesPageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "Não informado" : formatBRL(value);
}

export default async function ProjetoMedicoesPage({
  params,
}: ProjetoMedicoesPageProps) {
  const { id } = await params;
  const data = await getProjectMeasurementsData(id);

  if (!data) {
    notFound();
  }

  const { measurements } = data;
  const approvedCount = measurements.filter((item) => item.status === "APROVADA").length;
  const paidCount = measurements.filter((item) => item.status === "PAGA").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-3">
        <ProjectMetricCard
          label="Medições"
          value={formatNumber(measurements.length)}
          helper="Registros de acompanhamento físico-financeiro."
        />
        <ProjectMetricCard
          label="Aprovadas"
          value={formatNumber(approvedCount)}
          helper="Prontas para consolidação financeira."
        />
        <ProjectMetricCard
          label="Pagas"
          value={formatNumber(paidCount)}
          helper="Medições já liquidadas."
        />
      </section>

      <ProjectSectionCard
        eyebrow="Medições"
        title="Linha de medições"
        description="Medições físico-financeiras do projeto, com status, valores e responsáveis."
      >
        {measurements.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem medições registradas"
            description="Cadastre medições para acompanhar a execução do contrato e o avanço financeiro do projeto."
          />
        ) : (
          <div className="space-y-3">
            {measurements.map((measurement) => (
              <article
                key={measurement.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
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

                <div className="mt-4 grid gap-4 md:grid-cols-5 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Referência
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.referenceMonth ? formatDate(measurement.referenceMonth) : "Não informada"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Medido
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(measurement.measuredAmount ? Number(measurement.measuredAmount) : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Aprovado
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(measurement.approvedAmount ? Number(measurement.approvedAmount) : null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Pago
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatMoney(measurement.paidAmount ? Number(measurement.paidAmount) : null)}
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

                <div className="mt-3 grid gap-4 md:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Medido por
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.measuredBy?.name || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Aprovado por
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.approvedBy?.name || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Contrato
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.contract?.title || "Não vinculado"}
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
