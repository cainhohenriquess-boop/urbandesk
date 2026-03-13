import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getProjectHistoryData } from "@/lib/project-detail-data";
import { getProjectInspectionTypeLabel } from "@/lib/project-labels";
import { formatDateTime, formatNumber } from "@/lib/utils";

type ProjetoHistoricoPageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function ProjetoHistoricoPage({
  params,
}: ProjetoHistoricoPageProps) {
  const { id } = await params;
  const data = await getProjectHistoryData(id);

  if (!data) {
    notFound();
  }

  const { comments, auditLogs } = data;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-3">
        <ProjectMetricCard
          label="Comentários"
          value={formatNumber(comments.length)}
          helper="Registros de contexto e operação."
        />
        <ProjectMetricCard
          label="Eventos de auditoria"
          value={formatNumber(auditLogs.length)}
          helper="Ações críticas associadas ao projeto."
        />
        <ProjectMetricCard
          label="Internos"
          value={formatNumber(comments.filter((comment) => comment.isInternal).length)}
          helper="Comentários restritos à gestão interna."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ProjectSectionCard
          eyebrow="Comentários"
          title="Linha do tempo operacional"
          description="Comentários e observações registradas por equipe, gestão e responsáveis."
        >
          {comments.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem comentários"
              description="Os comentários do projeto aparecerão aqui para formar a memória operacional da equipe."
            />
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-xl border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
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
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Auditoria"
          title="Trilha de eventos do sistema"
          description="Eventos de criação, alteração, upload e outras ações instrumentadas relacionadas ao projeto."
        >
          {auditLogs.length === 0 ? (
            <ProjectEmptyBlock
              title="Sem eventos de auditoria"
              description="A trilha de auditoria aparecerá aqui quando o projeto acumular ações instrumentadas."
            />
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{log.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.userName || log.userEmail || "Sistema"} · {log.entityType || "evento"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </p>
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
