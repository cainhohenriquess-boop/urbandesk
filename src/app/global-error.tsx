"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0a0f1e] text-white">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-lg rounded-2xl border border-danger-400/40 bg-danger-950/30 p-8">
            <p className="text-xs uppercase tracking-widest text-danger-300">Erro de aplicação</p>
            <h1 className="mt-3 font-display text-3xl font-bold">Não foi possível carregar esta página</h1>
            <p className="mt-3 text-sm text-slate-200">
              Ocorreu uma falha inesperada. Tente recarregar ou voltar para a página inicial.
            </p>
            {error?.digest && (
              <p className="mt-2 text-xs text-slate-400">Código de referência: {error.digest}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => reset()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Tentar novamente
              </button>
              <Link
                href="/"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
