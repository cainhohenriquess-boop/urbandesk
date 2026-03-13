"use client";

import Link from "next/link";

// ─────────────────────────────────────────────
// Dados da landing
// ─────────────────────────────────────────────
const FEATURES = [
  {
    icon:  "🗺",
    title: "Workstation GIS",
    desc:  "Mapa interativo com Mapbox, desenho de pontos, linhas e polígonos, controle de camadas e exportação GeoJSON.",
  },
  {
    icon:  "📱",
    title: "App de Campo Offline",
    desc:  "PWA instalável no celular. Captura GPS de alta precisão, fotos com câmera traseira e sincronização automática ao retornar à rede.",
  },
  {
    icon:  "📊",
    title: "Dashboard Executivo",
    desc:  "KPIs em tempo real, gráficos de evolução de obras, orçamento executado e distribuição por status para a Secretaria.",
  },
  {
    icon:  "🔐",
    title: "Multi-tenancy & RBAC",
    desc:  "Cada prefeitura tem seu ambiente isolado. Controle de acesso por cargo: Secretário, Engenheiro e Equipe de Campo.",
  },
  {
    icon:  "🗄",
    title: "PostGIS nativo",
    desc:  "Dados geoespaciais armazenados em PostgreSQL + PostGIS com suporte a queries espaciais por bounding box.",
  },
  {
    icon:  "🤝",
    title: "Suporte especializado",
    desc:  "Chat de suporte integrado, documentação completa e acompanhamento de implantação para equipes municipais.",
  },
];

const PLANS = [
  {
    name:    "Starter",
    price:   "R$ 890",
    period:  "/mês",
    desc:    "Ideal para municípios até 100 mil habitantes",
    features:["Até 10 usuários", "5.000 ativos GIS", "App de Campo PWA", "Suporte por e-mail"],
    cta:     "Iniciar trial gratuito",
    featured: false,
  },
  {
    name:    "Pro",
    price:   "R$ 2.400",
    period:  "/mês",
    desc:    "Municípios em crescimento com múltiplas secretarias",
    features:["Até 30 usuários", "50.000 ativos GIS", "Dashboard executivo", "Suporte prioritário", "Exportação de relatórios PDF"],
    cta:     "Iniciar trial gratuito",
    featured: true,
  },
  {
    name:    "Enterprise",
    price:   "Sob consulta",
    period:  "",
    desc:    "Grandes cidades e consórcios municipais",
    features:["Usuários ilimitados", "Ativos ilimitados", "SLA 99,9%", "Gerente de conta dedicado", "Integração com sistemas legados"],
    cta:     "Falar com especialista",
    featured: false,
  },
];

const STATS = [
  { value:"140+", label:"Municípios atendidos"     },
  { value:"98%",  label:"SLA de disponibilidade"   },
  { value:"12k+", label:"Ativos mapeados"           },
  { value:"4.9",  label:"Avaliação dos usuários"   },
];

// ─────────────────────────────────────────────
// Layout público
// ─────────────────────────────────────────────
export default function LandingPage() {
  
  // Trata cliques em links não finalizados do rodapé
  const handleLegalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Páginas legais (Termos, Privacidade, LGPD) serão disponibilizadas na publicação oficial.");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden scroll-smooth">

      {/* ══ NAVBAR ══ */}
      <nav className="sticky top-0 z-topbar border-b border-white/[0.06] bg-[#0a0f1e]/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="font-display text-lg font-700 tracking-tight">
              Urban<span className="text-brand-400">Desk</span>
            </span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            {["Funcionalidades", "Sobre", "Planos"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors shadow-sm"
          >
            Acessar plataforma →
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        {/* Glow de fundo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-brand-600/10 blur-[120px]" />
        </div>

        {/* Grid SVG decorativo */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="hero-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3468f6" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-800/60 bg-brand-950/60 px-4 py-1.5 text-xs font-medium text-brand-400 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-dot" />
            Plataforma B2G — Gestão Municipal
          </div>

          <h1 className="font-display text-5xl font-800 leading-tight tracking-tight md:text-6xl">
            Infraestrutura urbana
            <br />
            <span className="text-gradient-brand">com inteligência GIS</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed">
            Do planejamento ao campo. Prefeituras que usam o UrbanDesk reduzem em{" "}
            <strong className="text-white">40% o tempo</strong> de gestão de obras e aumentam em{" "}
            <strong className="text-white">3×</strong> a precisão dos dados de infraestrutura.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-500 transition-colors shadow-[0_4px_24px_rgba(52,104,246,0.4)]"
            >
              Iniciar trial gratuito — 14 dias
            </Link>
            <a
              href="#funcionalidades"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white transition-colors"
            >
              Ver funcionalidades
            </a>
          </div>

          <p className="text-xs text-slate-600">Sem cartão de crédito · Suporte na implantação · Dados hospedados no Brasil</p>
        </div>

        {/* Preview do mapa */}
        <div className="relative mt-16 mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                {["#ef4444","#f59e0b","#10b981"].map((c) => (
                  <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="mx-auto rounded-md bg-white/[0.04] px-12 py-1 text-[10px] text-slate-600">
                app.urbandesk.com.br/app/projetos
              </div>
            </div>

            <div className="relative h-64 md:h-96 bg-[#1a2035] overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 800 400" className="opacity-30">
                {[50,100,150,200,250,300,350].map((y) => (
                  <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#3468f6" strokeWidth="0.5" />
                ))}
                {[80,160,240,320,400,480,560,640,720].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="400" stroke="#3468f6" strokeWidth="0.5" />
                ))}
                {[[90,60,60,70],[170,60,60,70],[250,60,60,70],[90,140,140,70],[250,140,60,70],[170,220,140,70],[90,300,60,70],[170,300,60,70],[250,300,60,70]].map(([x,y,w,h], i) => (
                  <rect key={i} x={x} y={y} width={w} height={h} fill="#3468f6" opacity="0.15" rx="2" />
                ))}
              </svg>

              {[
                { x:"35%", y:"40%", label:"Obra Ativa",    color:"#f59e0b" },
                { x:"55%", y:"30%", label:"Ativo #A14",    color:"#3468f6" },
                { x:"65%", y:"55%", label:"Alerta",        color:"#ef4444" },
                { x:"40%", y:"65%", label:"LED #204",      color:"#3468f6" },
              ].map((m) => (
                <div key={m.label} className="absolute flex flex-col items-center gap-1" style={{ left:m.x, top:m.y }}>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full shadow-lg text-white text-xs ring-2 ring-white/20" style={{ background:m.color }}>
                    📍
                  </div>
                  <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap backdrop-blur-sm">
                    {m.label}
                  </span>
                </div>
              ))}

              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 rounded-xl border border-white/10 bg-black/40 p-1.5 backdrop-blur-sm">
                {["🖱","📍","➖","⬡"].map((icon) => (
                  <div key={icon} className="flex h-7 w-7 items-center justify-center rounded-lg text-sm hover:bg-white/10 cursor-pointer">
                    {icon}
                  </div>
                ))}
              </div>

              <div className="absolute right-3 top-3 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm text-xs text-white/70 min-w-[120px]">
                <p className="font-medium text-white mb-2 text-[10px] uppercase tracking-wider">Camadas</p>
                {[
                  { label:"Ativos", on:true,  color:"#3468f6" },
                  { label:"Obras",  on:true,  color:"#f59e0b" },
                  { label:"Viário", on:false, color:"#94a3b8" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background:l.color, opacity:l.on?1:0.3 }} />
                    <span className={l.on ? "text-white/80" : "text-white/30"}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="border-y border-white/[0.05] bg-white/[0.02] py-12">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl font-800 text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FUNCIONALIDADES ══ */}
      <section id="funcionalidades" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-400 mb-3">Plataforma completa</p>
          <h2 className="font-display text-3xl font-800 text-white md:text-4xl">
            Tudo que uma prefeitura precisa
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Da gestão de projetos ao cadastro de ativos no campo, com dados GIS auditáveis e seguros.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all hover:border-brand-700/50 hover:bg-brand-950/30 shadow-sm"
            >
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="font-display text-base font-700 text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SOBRE (NOVA SEÇÃO) ══ */}
      <section id="sobre" className="border-y border-white/[0.05] bg-[#0d1529] py-24 relative overflow-hidden">
        {/* Elemento de background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="grid gap-16 md:grid-cols-2 items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-brand-400 mb-3">Nossa Missão</p>
              <h2 className="font-display text-3xl font-800 text-white md:text-4xl mb-6">
                Transformar a gestão pública através de dados
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                A UrbanDesk nasceu da necessidade de modernizar as prefeituras brasileiras. Sabemos que a gestão de infraestrutura muitas vezes depende de papel, planilhas desatualizadas e comunicação fragmentada.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                Nossa plataforma centraliza tudo em um mapa inteligente. Conectamos o engenheiro, o secretário e o operário com tecnologia robusta, garantindo transparência, economia de recursos e cidades preparadas para o futuro.
              </p>
              
              <div className="flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="font-display text-2xl font-bold text-white">100%</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Nacional</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="font-display text-2xl font-bold text-white">ISO 27001</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Segurança LGPD</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-brand-600/20 blur-2xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#0a0f1e] p-8 shadow-2xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 mb-6">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Construído para o Brasil</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Entendemos os desafios da conectividade e da administração pública. Nosso app funciona offline para equipes em áreas remotas e nossa infraestrutura garante que os dados da sua cidade nunca saiam do país.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PLANOS ══ */}
      <section id="planos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-400 mb-3">Preços transparentes</p>
          <h2 className="font-display text-3xl font-800 text-white md:text-4xl">
            Planos para todo porte de cidade
          </h2>
          <p className="mt-4 text-slate-400">14 dias de trial gratuito em todos os planos. Sem cartão de crédito.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 flex flex-col gap-5 ${
                plan.featured
                  ? "border-brand-600/60 bg-brand-950/50 ring-1 ring-brand-600/30"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white shadow-sm">
                    Mais popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-slate-400">{plan.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-800 text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-slate-500">{plan.period}</span>}
                </div>
                <p className="mt-2 text-xs text-slate-500">{plan.desc}</p>
              </div>

              <ul className="flex-1 space-y-3 mt-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-brand-400 text-sm mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`block rounded-xl py-2.5 text-center text-sm font-medium transition-colors mt-4 ${
                  plan.featured
                    ? "bg-brand-600 text-white hover:bg-brand-500"
                    : "border border-white/10 text-slate-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="border-t border-white/[0.05] py-24 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-display text-3xl font-800 text-white md:text-4xl mb-4">
            Pronto para modernizar sua gestão?
          </h2>
          <p className="text-slate-400 mb-8">
            Junte-se a mais de 140 municípios que já usam o UrbanDesk para gerir obras e infraestrutura com precisão.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors shadow-[0_4px_24px_rgba(52,104,246,0.4)]"
          >
            Começar trial gratuito — 14 dias
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="mt-4 text-xs text-slate-600">suporte@urbandesk.com.br · CNPJ 00.000.000/0001-00</p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-white/[0.04] py-8 bg-[#070b14]">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-brand-800">
              <svg className="h-3 w-3 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span>UrbanDesk © {new Date().getFullYear()}</span>
          </div>
          
          <div className="flex gap-5">
            {["Privacidade","Termos","LGPD","Segurança"].map((l) => (
              <a 
                key={l} 
                href="#" 
                onClick={handleLegalClick}
                className="hover:text-slate-300 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
          
          <p>Hospedagem 100% no Brasil · ISO 27001</p>
        </div>
      </footer>
    </div>
  );
}