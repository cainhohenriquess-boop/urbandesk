import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para início
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. Dados tratados</h2>
            <p>
              A plataforma trata dados de autenticação, trilhas operacionais, registros de ativos e
              metadados de uso para execução do contrato e segurança da operação.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Finalidade</h2>
            <p>
              Os dados são utilizados para disponibilizar funcionalidades, manter controle de acesso,
              registrar auditoria e prover suporte técnico.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Compartilhamento</h2>
            <p>
              Os dados são compartilhados apenas com provedores necessários para hospedagem e infraestrutura,
              sob contratos de confidencialidade e segurança.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Retenção e segurança</h2>
            <p>
              Mantemos controles técnicos e organizacionais para reduzir risco de acesso não autorizado e
              retemos dados conforme obrigações legais e contratuais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">5. Direitos do titular</h2>
            <p>
              Solicitações relacionadas a dados pessoais podem ser enviadas para{" "}
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
