import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveProjectsTenantId } from "@/lib/project-pages";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{ projectId?: string }>;

export default async function ProjetosMapaLegacyPage({
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
    redirect("/app/projetos");
  }

  const projects = await prisma.project.findMany({
    where: { tenantId },
    select: { id: true, name: true, status: true },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 8,
  });

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-card">
      <h2 className="font-display text-xl font-700 text-foreground">
        O mapa agora é aberto dentro do projeto
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Para manter a navegação consistente, o workspace técnico/cartográfico foi
        movido para a ficha do projeto.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/app/projetos"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Voltar para a carteira
        </Link>
        {projects[0] ? (
          <Link
            href={`/app/projetos/${projects[0].id}/mapa`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Abrir projeto mais recente
          </Link>
        ) : null}
      </div>

      {projects.length > 0 && (
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projetos/${project.id}/mapa`}
              className="rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-muted/50"
            >
              <p className="text-sm font-semibold text-foreground">{project.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{project.status}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
