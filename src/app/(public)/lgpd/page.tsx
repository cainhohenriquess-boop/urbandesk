import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function LgpdPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para início
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">LGPD</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. Papel das partes</h2>
            <p>
              O tenant contratante atua como controlador dos dados inseridos na operação.
              A UrbanDesk atua como operadora, tratando os dados conforme instruções contratuais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Bases legais e finalidade</h2>
            <p>
              O tratamento ocorre para execução do contrato, segurança da plataforma,
              auditoria de ações e continuidade da prestação do serviço.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Direitos dos titulares</h2>
            <p>
              Solicitações de acesso, correção e demais direitos previstos na LGPD podem ser
              encaminhadas para{" "}
              <a className="text-brand-400 hover:text-brand-300" href="mailto:privacidade@urbandesk.com.br">
                privacidade@urbandesk.com.br
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Encarregado (DPO)</h2>
            <p>
              O canal de atendimento para assuntos de proteção de dados é
              <span className="ml-1 font-semibold"> privacidade@urbandesk.com.br</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
