import Link from "next/link";

const UPDATED_AT = "13/03/2026";

export default function SegurancaPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-brand-400 hover:text-brand-300">
          Voltar para início
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold">Segurança</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: {UPDATED_AT}</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="font-display text-xl font-semibold text-white">1. Controles de acesso</h2>
            <p>
              A plataforma utiliza autenticação por usuário, sessão protegida e
              regras de autorização por papel e tenant.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">2. Trilha de auditoria</h2>
            <p>
              Ações críticas são registradas com usuário, data, ação e contexto para
              rastreabilidade operacional e governança.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">3. Proteção de dados</h2>
            <p>
              Aplicamos práticas de minimização de dados, segregação por tenant e
              monitoramento de falhas de aplicação.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-white">4. Reporte de incidente</h2>
            <p>
              Incidentes ou suspeitas podem ser reportados para{" "}
              <a className="text-brand-400 hover:text-brand-300" href="mailto:seguranca@urbandesk.com.br">
                seguranca@urbandesk.com.br
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
