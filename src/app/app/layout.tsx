import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

type Role = "SUPERADMIN" | "SECRETARIO" | "ENGENHEIRO" | "CAMPO";

// ─────────────────────────────────────────────
// Itens de navegação por Role
// O SUPERADMIN tem acesso absoluto a todas as telas para poder inspecionar
// ─────────────────────────────────────────────
const NAV_BY_ROLE: Record<Role, { label: string; href: string; icon: string; description: string }[]> = {
  SUPERADMIN: [
    { label: "Secretaria",   href: "/app/secretaria", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", description: "Dashboard executivo" },
    { label: "Projetos GIS", href: "/app/projetos",   icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", description: "Workstation cartográfica" },
    { label: "Campo",        href: "/app/campo",      icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z", description: "App PWA offline" },
  ],
  SECRETARIO: [
    { label: "Secretaria",   href: "/app/secretaria", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", description: "Dashboard executivo" },
    { label: "Projetos GIS", href: "/app/projetos",   icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", description: "Workstation cartográfica" },
  ],
  ENGENHEIRO: [
    { label: "Projetos GIS", href: "/app/projetos",   icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", description: "Workstation cartográfica" },
    { label: "Campo",        href: "/app/campo",      icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z", description: "App PWA offline" },
  ],
  CAMPO: [
    { label: "Campo",        href: "/app/campo",      icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z", description: "App PWA offline" },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  SECRETARIO: "Secretário",
  ENGENHEIRO: "Engenheiro",
  CAMPO:      "Equipe de Campo",
};

// ─────────────────────────────────────────────
// Layout Tenant (Server Component)
// ─────────────────────────────────────────────
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const role = (user?.role ?? "CAMPO") as Role;
  
  // Variáveis padrão que podem ser sobrescritas pelo Modo Fantasma
  let tenantName   = user?.tenantName ?? "Prefeitura";
  let trialEndsAt  = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  let isImpersonating = false;

  // 🚀 LÓGICA DO MODO FANTASMA (IMPERSONATION)
  if (role === "SUPERADMIN") {
    const impersonatedId = cookies().get("impersonate_tenant")?.value;
    if (impersonatedId) {
      isImpersonating = true;
      // Busca o nome real da prefeitura para a Sidebar ficar perfeita
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: impersonatedId },
          select: { name: true, trialEndsAt: true }
        });
        if (tenant) {
          tenantName = tenant.name;
          trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
        }
      } catch (e) {
        console.error("Erro ao buscar dados do tenant no modo fantasma", e);
      }
    }
  }

  const isTrial      = !!trialEndsAt;
  const trialExpired = trialEndsAt ? trialEndsAt < new Date() : false;

  // Se o trial expirou e NÃO for o SuperAdmin inspecionando, bloqueia.
  if (trialExpired && !isImpersonating) {
    redirect("/login?error=trial_expired");
  }

  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.CAMPO;

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className="flex w-sidebar-w flex-col border-r border-sidebar-border bg-sidebar shadow-sidebar">

        {/* Cabeçalho sidebar */}
        <div className="flex h-topbar-h shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 shrink-0">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-700 text-sidebar-foreground tracking-tight" title={tenantName}>
              {tenantName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">UrbanDesk</p>
          </div>
        </div>

        {/* Banner Trial */}
        {isTrial && daysLeft !== null && (
          <div className="mx-3 mt-3 rounded-lg border border-warning-700/40 bg-warning-900/30 px-3 py-2.5">
            <p className="text-xs font-medium text-warning-400">
              ⏱ Trial: {daysLeft} {daysLeft === 1 ? "dia" : "dias"} restante{daysLeft !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-[10px] text-warning-500/70">
              Expira em {formatDate(trialEndsAt!)}
            </p>
            <a
              href="mailto:vendas@urbandesk.com.br"
              className="mt-1.5 block text-[10px] font-medium text-warning-400 underline underline-offset-2 hover:no-underline"
            >
              Falar com vendas →
            </a>
          </div>
        )}

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">
            Módulos
          </p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {item.icon.split(" M").map((segment, i) => (
                  <path key={i} d={i === 0 ? segment : "M" + segment} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
              <div className="min-w-0">
                <p className="truncate font-medium">{item.label}</p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate">{item.description}</p>
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer sidebar — Usuário */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-700 text-white font-display ${isImpersonating ? "bg-danger-600 animate-pulse" : "bg-brand-700"}`}>
              {user?.name
                ? user.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")
                : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                {user?.name ?? "Usuário"}
              </p>
              <p className={`truncate text-[10px] font-bold ${isImpersonating ? "text-danger-400" : "text-sidebar-foreground/40"}`}>
                {isImpersonating ? "MODO FANTASMA" : ROLE_LABELS[role]}
              </p>
            </div>
            {/* Logout normal do sistema */}
            {!isImpersonating && (
              <Link
                href="/api/auth/signout"
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                title="Sair"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ── Conteúdo ── */}
      <div className="app-content">

        {/* Topbar */}
        <header className="flex h-topbar-h shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{tenantName}</span>
          </div>

          <div className="flex items-center gap-4">
            
            {/* 🚀 BOTÃO DE FUGA DO MODO FANTASMA */}
            {isImpersonating && (
              <Link 
                href="/api/auth/impersonate" 
                className="flex items-center gap-2 bg-danger-600 hover:bg-danger-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-danger-500/20 transition-all animate-pulse"
                title="Voltar ao Painel SuperAdmin"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sair do Modo Fantasma
              </Link>
            )}

            {/* Status ao vivo */}
            <div className="flex items-center gap-1.5 text-xs text-accent-600">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-dot" />
              <span className="hidden sm:inline">Online</span>
            </div>

            {/* Notificações */}
            <button className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {/* Badge de notificação */}
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger-500" />
            </button>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="app-main animate-fade-in relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}