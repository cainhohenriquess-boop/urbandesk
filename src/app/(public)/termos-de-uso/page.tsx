import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para inicio
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-400">Ultima atualizacao: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. Objeto</h2>
            <p>
              Estes termos regem o uso da plataforma UrbanDesk para gestao municipal de projetos,
              ativos georreferenciados e operacao de campo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Acesso e conta</h2>
            <p>
              O acesso e restrito a usuarios autorizados pelo tenant contratante. Cada usuario deve
              manter credenciais sob sigilo e usar a plataforma apenas para finalidades institucionais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Responsabilidades</h2>
            <p>
              O tenant e responsavel pela qualidade dos dados inseridos, permissao de acesso concedida
              aos seus usuarios e observancia da legislacao aplicavel.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Disponibilidade</h2>
            <p>
              A UrbanDesk adota melhores praticas para manter disponibilidade e seguranca do servico,
              sem garantia de continuidade absoluta em cenarios de forca maior.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">5. Suporte e contato</h2>
            <p>
              Duvidas operacionais podem ser enviadas para{" "}
              <a className="text-brand-400 hover:text-brand-300" href="mailto:suporte@urbandesk.com.br">
                suporte@urbandesk.com.br
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
