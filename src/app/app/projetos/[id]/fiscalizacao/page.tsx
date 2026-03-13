import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getProjectInspectionData } from "@/lib/project-detail-data";
import {
  getGovernanceTone,
  getProjectInspectionStatusLabel,
  getProjectInspectionTypeLabel,
} from "@/lib/project-labels";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoFiscalizacaoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoFiscalizacaoPage({
  params,
}: ProjetoFiscalizacaoPageProps) {
  const { id } = await params;
  const data = await getProjectInspectionData(id);

  if (!data) {
    notFound();
  }

  const { inspections } = data;
  const performedCount = inspections.filter((item) => item.status === "REALIZADA").length;
  const scheduledCount = inspections.filter((item) => item.status === "AGENDADA").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-3">
        <ProjectMetricCard
          label="Fiscalizações"
          value={formatNumber(inspections.length)}
          helper="Registros de inspeção do projeto."
        />
        <ProjectMetricCard
          label="Realizadas"
          value={formatNumber(performedCount)}
          helper="Já executadas em campo ou em rotina técnica."
        />
        <ProjectMetricCard
          label="Agendadas"
          value={formatNumber(scheduledCount)}
          helper="Inspeções ainda pendentes de execução."
        />
      </section>

      <ProjectSectionCard
        eyebrow="Fiscalização"
        title="Agenda e registros"
        description="Fiscalizações por tipo, status, responsável e evidências geradas."
      >
        {inspections.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem fiscalizações registradas"
            description="Cadastre fiscalizações para acompanhar vistorias, qualidade, recebimento e recomendações do projeto."
          />
        ) : (
          <div className="space-y-3">
            {inspections.map((inspection) => (
              <article
                key={inspection.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
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

                <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Agendada
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {inspection.scheduledAt ? formatDate(inspection.scheduledAt) : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Realizada
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {inspection.occurredAt ? formatDate(inspection.occurredAt) : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Fiscal
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {inspection.inspector?.name || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Evidências
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatNumber(inspection._count.documents + inspection._count.issues)} item(ns)
                    </p>
                  </div>
                </div>

                {inspection.summary ? (
                  <p className="mt-3 text-sm leading-6 text-foreground">{inspection.summary}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>
    </div>
  );
}
