import Link from "next/link";

export default function ProjetoNotFound() {
  return (
    <section className="rounded-2xl border border-warning-200 bg-warning-50 px-6 py-10 text-center shadow-card">
      <h2 className="font-display text-xl font-700 text-foreground">
        Projeto não encontrado
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        O projeto solicitado não existe neste tenant ou não está acessível para
        a sessão atual.
      </p>
      <Link
        href="/app/projetos"
        className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
      >
        Voltar para a carteira
      </Link>
    </section>
  );
}
