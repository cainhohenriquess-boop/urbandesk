import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProjectShellData } from "@/lib/project-pages";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Projeto360Page({ params }: ProjetoPageProps) {
  const { id } = await params;
  const { tenantId, project } = await getProjectShellData(id);

  if (!tenantId || !project) {
    notFound();
  }

  const [assetGroups, recentAssets] = await Promise.all([
    prisma.asset.groupBy({
      by: ["type"],
      where: { tenantId, projectId: project.id },
      _count: { _all: true },
    }),
    prisma.asset.findMany({
      where: { tenantId, projectId: project.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-700 text-foreground">
            Ficha 360º
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Esta ficha consolida o contexto do projeto como contêiner de gestão,
            reunindo visão executiva, frente cartográfica e áreas operacionais.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Escopo geográfico
              </p>
              <p className="mt-2 text-sm text-foreground">
                {project.geomWkt ? "Área geográfica informada." : "Sem geometria principal cadastrada."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Atualização recente
              </p>
              <p className="mt-2 text-sm text-foreground">
                {formatDate(project.updatedAt)}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-700 text-foreground">
            Frentes do projeto
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Documentos",
              "Medições",
              "Fiscalização",
              "Financeiro",
              "Planejamento",
              "Mapa técnico",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-lg font-700 text-foreground">
              Ativos por tipo
            </h3>
            <Link
              href={`/app/projetos/${project.id}/mapa`}
              className="text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Abrir mapa
            </Link>
          </div>

          {assetGroups.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Ainda não existem ativos vinculados a este projeto.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {assetGroups.map((group) => (
                <div
                  key={group.type}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">{group.type}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatNumber(group._count._all)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-700 text-foreground">
            Ativos recentes
          </h3>

          {recentAssets.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum ativo foi atualizado neste projeto até o momento.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {asset.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {asset.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Atualizado em {formatDate(asset.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
