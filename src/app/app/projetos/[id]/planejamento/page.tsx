import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getProjectPlanningData } from "@/lib/project-detail-data";
import { getGovernanceTone, getProjectTechnicalAreaLabel } from "@/lib/project-labels";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoPlanejamentoPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateValue(value: Date | null) {
  return value ? formatDate(value) : "Não informado";
}

export default async function ProjetoPlanejamentoPage({
  params,
}: ProjetoPlanejamentoPageProps) {
  const { id } = await params;
  const data = await getProjectPlanningData(id);

  if (!data) {
    notFound();
  }

  const { phases, milestones } = data;
  const completedPhases = phases.filter((phase) => phase.status === "CONCLUIDA");
  const delayedPhases = phases.filter(
    (phase) =>
      phase.plannedEndDate &&
      phase.status !== "CONCLUIDA" &&
      phase.status !== "CANCELADA" &&
      phase.plannedEndDate.getTime() < Date.now()
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Fases"
          value={formatNumber(phases.length)}
          helper={`${formatNumber(completedPhases.length)} concluída(s).`}
        />
        <ProjectMetricCard
          label="Marcos"
          value={formatNumber(milestones.length)}
          helper="Acompanhamento executivo do cronograma."
        />
        <ProjectMetricCard
          label="Fases críticas"
          value={formatNumber(delayedPhases.length)}
          helper="Com prazo planejado vencido e ainda em aberto."
        />
        <ProjectMetricCard
          label="Frentes técnicas"
          value={formatNumber(
            new Set(phases.map((phase) => phase.technicalArea).filter(Boolean)).size
          )}
          helper="Áreas técnicas já distribuídas nas fases."
        />
      </section>

      <ProjectSectionCard
        eyebrow="Planejamento"
        title="Estrutura por fases"
        description="Cronograma operacional do projeto organizado por fase, responsável, prazo e avanço."
      >
        {phases.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem fases cadastradas"
            description="O projeto ainda não foi estruturado em fases. Use essa área para acompanhar o cronograma e a execução por frente de trabalho."
          />
        ) : (
          <div className="space-y-3">
            {phases.map((phase) => (
              <article
                key={phase.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Fase {phase.sequence}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">
                      {phase.name}
                    </h3>
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
                    {phase.plannedEndDate &&
                    phase.status !== "CONCLUIDA" &&
                    phase.status !== "CANCELADA" &&
                    phase.plannedEndDate.getTime() < Date.now() ? (
                      <ProjectBadge label="Atrasada" tone="danger" />
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Prazo planejado
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
                        phase._count.documents +
                          phase._count.measurements +
                          phase._count.inspections +
                          phase._count.issues +
                          phase._count.risks
                      )}{" "}
                      registro(s)
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>

      <ProjectSectionCard
        eyebrow="Marcos"
        title="Marcos e entregas"
        description="Entregas executivas e pontos de controle do cronograma."
      >
        {milestones.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem marcos definidos"
            description="Cadastre marcos para dar visibilidade à evolução do projeto e apoiar a gestão executiva."
          />
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <article
                key={milestone.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{milestone.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {milestone.phase
                        ? `Fase ${milestone.phase.sequence} · ${milestone.phase.name}`
                        : "Marco geral do projeto"}
                    </p>
                  </div>
                  <ProjectBadge
                    label={milestone.status.toLowerCase().replaceAll("_", " ")}
                    tone={getGovernanceTone(milestone.status)}
                  />
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Meta
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatDateValue(milestone.targetDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Responsável
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {milestone.responsibleUser?.name || "Não definido"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Conclusão
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatDateValue(milestone.completedAt)}
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
