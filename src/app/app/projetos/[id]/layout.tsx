import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectShellNav } from "@/components/projetos/project-shell-nav";
import { getProjectShellData } from "@/lib/project-pages";
import { formatBRL, formatDate, getStatusConfig } from "@/lib/utils";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjetoLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;
  const { project } = await getProjectShellData(id);

  if (!project) {
    notFound();
  }

  const statusConfig = getStatusConfig(project.status);
  const periodLabel =
    project.startDate || project.endDate
      ? `${project.startDate ? formatDate(project.startDate) : "Sem início"} · ${
          project.endDate ? formatDate(project.endDate) : "Sem término"
        }`
      : "Cronograma não informado";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card px-6 py-5 shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
              Projeto
            </p>
            <h2 className="mt-2 font-display text-2xl font-800 text-foreground">
              {project.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {project.description?.trim() || "Projeto sem descrição detalhada até o momento."}
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              Abrir mapa
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Orçamento
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {project.budget ? formatBRL(Number(project.budget)) : "Não informado"}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Progresso
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {project.completionPct}%
            </p>
          </article>

          <article className="rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Ativos vinculados
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {project._count.assets}
            </p>
          </article>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{periodLabel}</p>
      </section>

      <ProjectShellNav projectId={project.id} />

      {children}
    </div>
  );
}
