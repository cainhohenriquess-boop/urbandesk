export default function ProjetosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card px-6 py-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
          Módulo de Projetos
        </p>
        <h1 className="mt-2 font-display text-2xl font-800 text-foreground">
          Carteira de Projetos
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A carteira centraliza a navegação do módulo, enquanto cada projeto
          passa a ter ficha 360º, mapa técnico e áreas dedicadas para operação
          e expansão futura.
        </p>
      </section>

      {children}
    </div>
  );
}
