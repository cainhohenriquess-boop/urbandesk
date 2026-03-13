import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para inicio
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">Politica de Cookies</h1>
        <p className="mt-2 text-sm text-slate-400">Ultima atualizacao: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. O que sao cookies</h2>
            <p>
              Cookies sao pequenos arquivos armazenados no navegador para manter sessao, preferencias e
              diagnostico basico de funcionamento da aplicacao.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Tipos usados</h2>
            <p>
              Utilizamos cookies estritamente necessarios para autenticacao e seguranca, e cookies de
              performance para analise agregada de estabilidade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Controle do usuario</h2>
            <p>
              O usuario pode gerenciar cookies no navegador. A desativacao de cookies essenciais pode
              impactar login e funcionamento de modulos protegidos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Contato</h2>
            <p>
              Para orientacoes adicionais, escreva para{" "}
              <a className="text-brand-400 hover:text-brand-300" href="mailto:privacidade@urbandesk.com.br">
                privacidade@urbandesk.com.br
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
