import Link from "next/link";

type ProjectSchemaWarningProps = {
  notice: string;
};

export function ProjectSchemaWarning({ notice }: ProjectSchemaWarningProps) {
  return (
    <section className="rounded-2xl border border-warning-200 bg-warning-50 px-6 py-10 text-center shadow-card">
      <h2 className="font-display text-xl font-700 text-foreground">
        Módulo de Projetos em modo compatível
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{notice}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/app/projetos"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          Voltar para a carteira
        </Link>
        <Link
          href="/app/billing"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Abrir billing
        </Link>
      </div>
    </section>
  );
}
