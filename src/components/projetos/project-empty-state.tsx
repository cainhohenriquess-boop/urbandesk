import Link from "next/link";

type ProjectEmptyStateProps = {
  projectId: string;
  title: string;
  description: string;
};

export function ProjectEmptyState({
  projectId,
  title,
  description,
}: ProjectEmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-card">
      <h2 className="font-display text-xl font-700 text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/app/projetos/${projectId}`}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Voltar para a ficha
        </Link>
        <Link
          href={`/app/projetos/${projectId}/mapa`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          Abrir mapa do projeto
        </Link>
      </div>
    </section>
  );
}
