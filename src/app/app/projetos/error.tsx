"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ProjetosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PROJECTS_ROUTE_ERROR]", error);
  }, [error]);

  return (
    <section className="rounded-2xl border border-danger-200 bg-danger-50 px-6 py-10 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-danger-700">
        Módulo de Projetos
      </p>
      <h1 className="mt-2 font-display text-2xl font-800 text-danger-950">
        Não foi possível abrir a carteira de projetos
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-danger-800">
        Encontramos uma falha inesperada nesta rota. Você pode tentar carregar
        a carteira novamente ou voltar para a área principal.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-danger-700">
          Código de referência: {error.digest}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-500"
        >
          Tentar novamente
        </button>
        <Link
          href="/app/secretaria"
          className="rounded-lg border border-danger-200 px-4 py-2 text-sm font-semibold text-danger-900 hover:bg-danger-100"
        >
          Voltar para a secretaria
        </Link>
      </div>
    </section>
  );
}

