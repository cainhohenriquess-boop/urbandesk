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
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { getTechnicalObjectLabel, isTechnicalObjectType } from "@/lib/project-disciplines";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoFiscalizacaoPageProps = {
  params: Promise<{ id: string }>;
};

function getTechnicalObjectSummary(value: string | null | undefined) {
  return value && isTechnicalObjectType(value) ? getTechnicalObjectLabel(value) : "N\u00e3o informado";
}

function getInspectionSource(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "Projeto";
  return (metadata as { source?: unknown }).source === "campo" ? "Campo" : "Projeto";
}

export default async function ProjetoFiscalizacaoPage({ params }: ProjetoFiscalizacaoPageProps) {
  const { id } = await params;
  const data = await getProjectInspectionData(id);

  if (!data) notFound();

  const { inspections } = data;
  const performedCount = inspections.filter((item) => item.status === "REALIZADA").length;
  const scheduledCount = inspections.filter((item) => item.status === "AGENDADA").length;
  const fieldCount = inspections.filter((item) => getInspectionSource(item.metadata) === "Campo").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard label="Fiscaliza\u00e7\u00f5es" value={formatNumber(inspections.length)} helper="Registros de inspe\u00e7\u00e3o e vistoria do projeto." />
        <ProjectMetricCard label="Realizadas" value={formatNumber(performedCount)} helper="J\u00e1 executadas em campo ou rotina t\u00e9cnica." />
        <ProjectMetricCard label="Agendadas" value={formatNumber(scheduledCount)} helper="Ainda pendentes de execu\u00e7\u00e3o." />
        <ProjectMetricCard label="Vinculadas ao campo" value={formatNumber(fieldCount)} helper="Criadas a partir do app de campo/fiscaliza\u00e7\u00e3o." />
      </section>

      <ProjectSectionCard eyebrow="Fiscaliza\u00e7\u00e3o" title="Agenda e registros" description="Fiscaliza\u00e7\u00f5es por tipo, status, \u00c1rea t\u00e9cnica, etapa e objeto relacionado.">
        {inspections.length === 0 ? (
          <ProjectEmptyBlock title="Sem fiscaliza\u00e7\u00f5es registradas" description="As fiscaliza\u00e7\u00f5es do projeto aparecer\u00e3o aqui com etapa, ativo vinculado e origem do registro." />
        ) : (
          <div className="space-y-3">
            {inspections.map((inspection) => (
              <article key={inspection.id} className="rounded-xl border border-border bg-background px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{inspection.summary || getProjectInspectionTypeLabel(inspection.inspectionType)}</p>
                      {inspection.technicalArea && <ProjectBadge label={getProjectTechnicalAreaLabel(inspection.technicalArea)} tone="neutral" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {inspection.phase ? `Fase ${inspection.phase.sequence} \u00b7 ${inspection.phase.name}` : inspection.location || "Projeto"}
                    </p>
                  </div>
                  <ProjectBadge label={getProjectInspectionStatusLabel(inspection.status)} tone={getGovernanceTone(inspection.status)} />
                </div>

                <div className="mt-4 grid gap-4 text-sm md:grid-cols-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tipo</p>
                    <p className="mt-1 font-medium text-foreground">{getProjectInspectionTypeLabel(inspection.inspectionType)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Origem</p>
                    <p className="mt-1 font-medium text-foreground">{getInspectionSource(inspection.metadata)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Realizada</p>
                    <p className="mt-1 font-medium text-foreground">{inspection.occurredAt ? formatDate(inspection.occurredAt) : "N\u00e3o informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Fiscal</p>
                    <p className="mt-1 font-medium text-foreground">{inspection.inspector?.name || "N\u00e3o informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Evid\u00eancias</p>
                    <p className="mt-1 font-medium text-foreground">{formatNumber(inspection._count.documents + inspection._count.issues)} item(ns)</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">\u00c1rea t\u00e9cnica</p>
                    <p className="mt-1 font-medium text-foreground">{inspection.technicalArea ? getProjectTechnicalAreaLabel(inspection.technicalArea) : "N\u00e3o informada"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Objeto t\u00e9cnico</p>
                    <p className="mt-1 font-medium text-foreground">{getTechnicalObjectSummary(inspection.technicalObjectType)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ativo relacionado</p>
                    <p className="mt-1 font-medium text-foreground">{inspection.asset?.name || "Sem v\u00ednculo direto"}</p>
                  </div>
                </div>

                {inspection.findings ? <p className="mt-4 text-sm leading-6 text-foreground">{inspection.findings}</p> : null}
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>
    </div>
  );
}
