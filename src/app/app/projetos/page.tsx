import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectPortfolioClient } from "@/components/projetos/project-portfolio-client";
import { resolveProjectsTenantId } from "@/lib/project-pages";
import { formatBRLCompact, formatNumber, formatPercent } from "@/lib/utils";

type SearchParams = Promise<{ projectId?: string }>;

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const projectId = resolvedSearchParams.projectId?.trim();

  if (projectId) {
    redirect(`/app/projetos/${encodeURIComponent(projectId)}/mapa`);
  }

  const tenantId = await resolveProjectsTenantId();

  if (!tenantId) {
    return (
      <section className="rounded-2xl border border-warning-200 bg-warning-50 px-6 py-10 text-center shadow-card">
        <h2 className="font-display text-xl font-700 text-foreground">
          Ambiente do tenant não identificado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O módulo de projetos precisa de um tenant ativo para abrir a carteira.
        </p>
        <Link
          href="/app/secretaria"
          className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          Voltar para a secretaria
        </Link>
      </section>
    );
  }

  const projects = await prisma.project.findMany({
    where: { tenantId },
    include: { _count: { select: { assets: true } } },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (project) =>
      project.status === "PLANEJADO" || project.status === "EM_ANDAMENTO"
  ).length;
  const delayedProjects = projects.filter((project) => {
    if (!project.endDate) return false;

    return (
      project.endDate.getTime() < Date.now() &&
      project.status !== "CONCLUIDO" &&
      project.status !== "CANCELADO"
    );
  }).length;
  const totalBudget = projects.reduce(
    (acc, project) => acc + Number(project.budget ?? 0),
    0
  );
  const averageCompletion =
    totalProjects > 0
      ? projects.reduce((acc, project) => acc + project.completionPct, 0) /
        totalProjects /
        100
      : 0;

  const firstProject = projects[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            Carteira de Projetos
          </p>
          <h2 className="mt-2 font-display text-2xl font-800 text-foreground">
            Gestão do portfólio urbano por projeto
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            A carteira concentra cadastro, filtros, governança e acesso para a
            ficha 360º de cada projeto. O mapa, documentos, medições,
            fiscalização, financeiro e planejamento passam a nascer dentro do
            contexto do projeto.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {firstProject ? (
              <Link
                href={`/app/projetos/${firstProject.id}`}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Abrir projeto mais recente
              </Link>
            ) : null}

            <Link
              href="/app/campo"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir módulo de campo
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Projetos ativos
            </p>
            <p className="mt-2 font-display text-2xl font-800 text-foreground">
              {formatNumber(activeProjects)}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Risco de prazo
            </p>
            <p className="mt-2 font-display text-2xl font-800 text-foreground">
              {formatNumber(delayedProjects)}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Orçamento total
            </p>
            <p className="mt-2 font-display text-2xl font-800 text-foreground">
              {formatBRLCompact(totalBudget)}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Conclusão média
            </p>
            <p className="mt-2 font-display text-2xl font-800 text-foreground">
              {formatPercent(averageCompletion)}
            </p>
          </article>
        </div>
      </section>

      <ProjectPortfolioClient />
    </div>
  );
}
