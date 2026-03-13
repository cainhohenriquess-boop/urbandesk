import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-brand-400">Erro 404</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Página não encontrada</h1>
        <p className="mt-3 text-sm text-slate-300">
          O endereço informado não existe ou foi movido.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Ir para início
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
          >
            Ir para login
          </Link>
        </div>
      </div>
    </main>
  );
}
