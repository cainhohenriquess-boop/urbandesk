import Link from "next/link";

const FEATURES = [
  {
    title: "Workstation GIS",
    desc: "Mapa interativo com desenho de pontos, linhas e poligonos, controle de camadas e exportacao GeoJSON.",
  },
  {
    title: "App de Campo Offline",
    desc: "PWA instalavel no celular com captura de GPS, fotos e sincronizacao automatica quando a conexao retorna.",
  },
  {
    title: "Dashboard Executivo",
    desc: "KPIs em tempo real para obras, ativos, orcamento e evolucao por status.",
  },
  {
    title: "Multi-tenancy e RBAC",
    desc: "Ambiente isolado por prefeitura e controle de acesso por papel.",
  },
  {
    title: "PostGIS Nativo",
    desc: "Dados espaciais em PostgreSQL + PostGIS para consultas geograficas confiaveis.",
  },
  {
    title: "Suporte Especializado",
    desc: "Acompanhamento tecnico durante implantacao e operacao diaria.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "R$ 890",
    period: "/mes",
    desc: "Ideal para municipios ate 100 mil habitantes.",
    ctaLabel: "Iniciar trial",
    ctaHref: "/login?plan=starter",
  },
  {
    name: "Pro",
    price: "R$ 2.400",
    period: "/mes",
    desc: "Para operacao com multiplas equipes e maior volume de ativos.",
    ctaLabel: "Iniciar trial",
    ctaHref: "/login?plan=pro",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    desc: "Para grandes cidades e operacoes com requisitos avancados.",
    ctaLabel: "Falar com especialista",
    ctaHref: "mailto:comercial@urbandesk.com.br?subject=Plano%20Enterprise",
  },
];

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <nav className="sticky top-0 z-topbar border-b border-white/10 bg-[#0a0f1e]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            Urban<span className="text-brand-400">Desk</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#contato" className="hover:text-white transition-colors">Contato</a>
          </div>

          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
          >
            Acessar plataforma
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-brand-400">Gestao municipal inteligente</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-6xl">
          Infraestrutura urbana com dados confiaveis
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 md:text-lg">
          Planeje, execute e monitore projetos e ativos GIS com equipes conectadas no escritorio e no campo.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login?intent=trial"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
          >
            Iniciar trial de 14 dias
          </Link>
          <a
            href="mailto:comercial@urbandesk.com.br?subject=Solicitar%20demonstracao"
            className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-white/40 hover:text-white transition-colors"
          >
            Solicitar demonstracao
          </a>
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold">Funcionalidades principais</h2>
          <p className="mt-2 text-sm text-slate-400">Modulos para secretaria, engenharia, campo e administracao.</p>
        </div>

        {FEATURES.length === 0 ? (
          <EmptyState
            title="Catalogo de funcionalidades indisponivel"
            description="Nao foi possivel carregar as funcionalidades no momento. Tente novamente mais tarde."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-display text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{feature.desc}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold">Planos</h2>
          <p className="mt-2 text-sm text-slate-400">Preco transparente e onboarding assistido.</p>
        </div>

        {PLANS.length === 0 ? (
          <EmptyState
            title="Planos indisponiveis"
            description="As informacoes comerciais nao estao disponiveis no momento."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-xl border p-6 ${plan.featured ? "border-brand-500 bg-brand-950/40" : "border-white/10 bg-white/5"}`}
              >
                <p className="text-sm text-slate-300">{plan.name}</p>
                <p className="mt-2 font-display text-3xl font-bold text-white">
                  {plan.price}
                  {plan.period && <span className="ml-1 text-base text-slate-400">{plan.period}</span>}
                </p>
                <p className="mt-3 text-sm text-slate-300">{plan.desc}</p>

                {plan.ctaHref.startsWith("mailto:") ? (
                  <a
                    href={plan.ctaHref}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
                  >
                    {plan.ctaLabel}
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                  >
                    {plan.ctaLabel}
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="contato" className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold">Pronto para publicar sua operacao digital?</h2>
          <p className="mt-3 text-sm text-slate-300">
            Fale com nosso time para validar escopo tecnico, implantacao e governanca dos dados.
          </p>
          <a
            href="mailto:comercial@urbandesk.com.br?subject=Contato%20comercial"
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Falar com comercial
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#070b14] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-slate-400 md:flex-row">
          <p>UrbanDesk (c) {new Date().getFullYear()} - plataforma para gestao urbana</p>

          <div className="flex items-center gap-4">
            <Link href="/termos-de-uso" className="hover:text-white">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link href="/cookies" className="hover:text-white">Cookies</Link>
          </div>

          <a href="mailto:suporte@urbandesk.com.br" className="hover:text-white">
            suporte@urbandesk.com.br
          </a>
        </div>
      </footer>
    </div>
  );
}
