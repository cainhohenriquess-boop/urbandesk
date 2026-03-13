import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectPortfolioClient } from "@/components/projetos/project-portfolio-client";
import { resolveProjectsTenantId } from "@/lib/project-pages";

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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            Carteira de Projetos
          </p>
          <h2 className="mt-2 font-display text-2xl font-800 text-foreground">
            Portfólio urbano com visão executiva e operação por projeto
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            A carteira concentra cadastro, filtros, governança e acesso à ficha
            360º de cada projeto. O GIS continua relevante, mas agora aparece
            como uma frente técnica dentro de um módulo mais amplo de gestão.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/app/projetos/mapa"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
            >
              Abrir workspace cartográfico
            </Link>
            <Link
              href="/app/campo"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abrir módulo de campo
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Como usar
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>Filtre por secretaria, status, tipo, bairro, prazo e orçamento.</li>
            <li>Cadastre ou ajuste o núcleo executivo do projeto no painel lateral.</li>
            <li>Abra a ficha 360º para navegar entre mapa, documentos e medições.</li>
          </ul>
        </aside>
      </section>

      <ProjectPortfolioClient />
    </div>
  );
}
