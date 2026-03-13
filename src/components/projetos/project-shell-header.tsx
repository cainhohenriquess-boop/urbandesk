import Link from "next/link";
import { getProjectPriorityLabel, getProjectStatusLabel, getProjectTypeLabel } from "@/lib/project-portfolio";
import {
  resolveProjectContractedAmount,
  resolveProjectContractorName,
  resolveProjectDeadline,
  resolveProjectFinancialProgress,
  resolveProjectLocation,
  resolveProjectPhysicalProgress,
} from "@/lib/project-detail-data";
import {
  getProjectOperationalStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import type { ProjectShellRecord } from "@/lib/project-pages";
import { formatBRL, formatDate, formatNumber, getStatusConfig } from "@/lib/utils";
import {
  ProjectBadge,
  ProjectMetricCard,
  ProjectProgressCard,
} from "@/components/projetos/project-detail-components";

type ProjectShellHeaderProps = {
  project: ProjectShellRecord;
};

export function ProjectShellHeader({ project }: ProjectShellHeaderProps) {
  const statusConfig = getStatusConfig(project.status);
  const deadline = resolveProjectDeadline(project);
  const contractedAmount = resolveProjectContractedAmount(project);
  const physicalProgress = resolveProjectPhysicalProgress(project);
  const financialProgress = resolveProjectFinancialProgress(project);
  const locationLabel = resolveProjectLocation(project);
  const contractorLabel = resolveProjectContractorName(project);

  return (
    <section className="rounded-[28px] border border-border bg-card px-6 py-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            {project.code ? `Projeto ${project.code}` : "Projeto"}
          </p>
          <h2 className="mt-2 font-display text-3xl font-800 tracking-tight text-foreground">
            {project.name}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {project.description?.trim() ||
              "Projeto sem descrição detalhada registrada até o momento."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <ProjectBadge label={getProjectStatusLabel(project.status)} tone="brand" />
            <ProjectBadge
              label={getProjectOperationalStatusLabel(project.operationalStatus)}
              tone="neutral"
            />
            <ProjectBadge label={getProjectPriorityLabel(project.priority)} tone="warning" />
            {project.projectType ? (
              <ProjectBadge label={getProjectTypeLabel(project.projectType)} tone="neutral" />
            ) : null}
            {project.technicalAreas.slice(0, 3).map((area) => (
              <ProjectBadge
                key={area}
                label={getProjectTechnicalAreaLabel(area)}
                tone="success"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/projetos"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Voltar para a carteira
          </Link>
          <Link
            href={`/app/projetos/${project.id}/mapa`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Abrir mapa/GIS
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Secretaria
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {project.responsibleDepartment || "Não informada"}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Bairro / Região
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {locationLabel || "Não informado"}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Empresa contratada
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {contractorLabel || "Não informada"}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Fiscal responsável
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {project.inspector?.name || "Não definido"}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Prazo
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {deadline ? formatDate(deadline) : "Sem prazo definido"}
            </p>
          </article>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <ProjectMetricCard
            label="Valor contratado"
            value={contractedAmount ? formatBRL(contractedAmount) : "Não informado"}
            helper={
              project.contractNumber
                ? `Contrato de referência ${project.contractNumber}`
                : "Valor consolidado do projeto ou do contrato mais recente."
            }
          />
          <ProjectProgressCard
            label="Avanço físico"
            value={physicalProgress}
            helper={`Gestor responsável: ${project.manager?.name || "não definido"}`}
            tone="brand"
          />
          <ProjectProgressCard
            label="Avanço financeiro"
            value={financialProgress}
            helper={`Operacional: ${getProjectOperationalStatusLabel(project.operationalStatus)}`}
            tone={financialProgress >= 75 ? "success" : financialProgress >= 35 ? "brand" : "warning"}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 border-t border-border pt-4 text-sm text-muted-foreground md:grid-cols-5">
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Ativos GIS
          </span>
          <span className="mt-1 block font-semibold text-foreground">
            {formatNumber(project._count.assets)}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Documentos
          </span>
          <span className="mt-1 block font-semibold text-foreground">
            {formatNumber(project._count.documents)}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Medições
          </span>
          <span className="mt-1 block font-semibold text-foreground">
            {formatNumber(project._count.measurements)}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Inspeções
          </span>
          <span className="mt-1 block font-semibold text-foreground">
            {formatNumber(project._count.inspections)}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Atualizado em
          </span>
          <span className="mt-1 block font-semibold text-foreground">
            {formatDate(project.updatedAt)}
          </span>
        </div>
      </div>
    </section>
  );
}
