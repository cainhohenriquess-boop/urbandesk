import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para início
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">Política de Cookies</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. O que são cookies</h2>
            <p>
              Cookies são pequenos arquivos armazenados no navegador para manter sessão, preferências e
              diagnóstico básico de funcionamento da aplicação.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Tipos usados</h2>
            <p>
              Utilizamos cookies estritamente necessários para autenticação e segurança, e cookies de
              performance para análise agregada de estabilidade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Controle do usuário</h2>
            <p>
              O usuário pode gerenciar cookies no navegador. A desativação de cookies essenciais pode
              impactar login e funcionamento de módulos protegidos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Contato</h2>
            <p>
              Para orientações adicionais, escreva para{" "}
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
