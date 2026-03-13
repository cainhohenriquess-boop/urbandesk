import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para início
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. Objeto</h2>
            <p>
              Estes termos regem o uso da plataforma UrbanDesk para gestão municipal de projetos,
              ativos georreferenciados e operação de campo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Acesso e conta</h2>
            <p>
              O acesso é restrito a usuários autorizados pelo tenant contratante. Cada usuário deve
              manter credenciais sob sigilo e usar a plataforma apenas para finalidades institucionais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Responsabilidades</h2>
            <p>
              O tenant é responsável pela qualidade dos dados inseridos, permissão de acesso concedida
              aos seus usuários e observância da legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Disponibilidade</h2>
            <p>
              A UrbanDesk adota melhores práticas para manter disponibilidade e segurança do serviço,
              sem garantia de continuidade absoluta em cenários de força maior.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">5. Suporte e contato</h2>
            <p>
              Dúvidas operacionais podem ser enviadas para{" "}
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
