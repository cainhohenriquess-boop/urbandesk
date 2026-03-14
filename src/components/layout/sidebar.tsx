"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn, getInitials, formatDate } from "@/lib/utils";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
type Role = "SUPERADMIN" | "SECRETARIO" | "ENGENHEIRO" | "CAMPO";

interface NavItem {
  label:       string;
  href:        string;
  iconPath:    string;
  description: string;
  badge?:      string;
}

// ─────────────────────────────────────────────
// Navegação por Role
// ─────────────────────────────────────────────
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  SUPERADMIN: [
    { label:"Dashboard",    href:"/superadmin",           iconPath:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", description:"Painel do Proprietário"  },
    { label:"Prefeituras",  href:"/superadmin/tenants",   iconPath:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", description:"Gestão de municípios"    },
    { label:"Camadas",      href:"/superadmin/camadas",   iconPath:"M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", description:"Camadas elétricas publicadas" },
    { label:"Financeiro",   href:"/superadmin/financeiro",iconPath:"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", description:"MRR, planos e cobranças" },
    { label:"Auditoria",    href:"/superadmin/auditoria", iconPath:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", description:"Logs de acesso"          },
    { label:"Configurações",href:"/superadmin/config",    iconPath:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", description:"Sistema e plataforma"   },
  ],
  SECRETARIO: [
    { label:"Secretaria",   href:"/app/secretaria", iconPath:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", description:"Dashboard executivo"    },
    { label:"Projetos",     href:"/app/projetos",   iconPath:"M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", description:"Carteira, mapa e ativos" },
  ],
  ENGENHEIRO: [
    { label:"Projetos",     href:"/app/projetos",   iconPath:"M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", description:"Carteira, mapa e ativos" },
    { label:"Campo",        href:"/app/campo",      iconPath:"M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z", description:"App PWA de campo"        },
  ],
  CAMPO: [
    { label:"Campo",        href:"/app/campo",      iconPath:"M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z", description:"App PWA de campo"        },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Proprietário",
  SECRETARIO: "Secretário",
  ENGENHEIRO: "Engenheiro",
  CAMPO:      "Equipe de Campo",
};

// ─────────────────────────────────────────────
// Ícone SVG
// ─────────────────────────────────────────────
function NavIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={cn("h-4 w-4 shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      {path.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : "M" + seg} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Sidebar Component
// ─────────────────────────────────────────────
interface SidebarProps {
  variant?: "app" | "superadmin";
}

export function Sidebar({ variant = "app" }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const user        = session?.user as any;
  const role        = (user?.role ?? "CAMPO") as Role;
  const name        = user?.name ?? "Usuário";
  const email       = user?.email ?? "";
  const tenantName  = user?.tenantName ?? "Prefeitura";
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const daysLeft    = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.CAMPO;

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-sidebar-border bg-sidebar shadow-sidebar transition-all duration-300",
        collapsed ? "w-sidebar-w-collapsed" : "w-sidebar-w"
      )}
    >
      {/* ── Logo / Tenant ── */}
      <div className="flex h-topbar-h shrink-0 items-center gap-3 border-b border-sidebar-border px-4 overflow-hidden">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1 animate-fade-in">
            <p className="truncate font-display text-sm font-700 text-sidebar-foreground tracking-tight">
              {variant === "superadmin" ? "UrbanDesk" : tenantName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">
              {variant === "superadmin" ? "SuperAdmin" : "UrbanDesk"}
            </p>
          </div>
        )}
      </div>

      {/* ── Trial banner ── */}
      {!collapsed && daysLeft !== null && variant === "app" && (
        <div className="mx-3 mt-3 rounded-lg border border-warning-700/40 bg-warning-900/20 px-3 py-2 animate-fade-in">
          <p className="text-xs font-medium text-warning-400">
            ⏱ {daysLeft}d restantes de trial
          </p>
          <a href="mailto:vendas@urbandesk.com.br" className="text-[10px] text-warning-500 underline underline-offset-2">
            Falar com vendas →
          </a>
        </div>
      )}

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">
            {variant === "superadmin" ? "Administração" : "Módulos"}
          </p>
        )}

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <NavIcon
                path={item.iconPath}
                className={cn(
                  "transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                )}
              />

              {!collapsed && (
                <div className="min-w-0 flex-1 animate-fade-in">
                  <p className={cn("truncate text-sm font-medium leading-none", isActive && "text-sidebar-primary")}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-sidebar-foreground/40">
                    {item.description}
                  </p>
                </div>
              )}

              {!collapsed && item.badge && (
                <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {item.badge}
                </span>
              )}

              {/* Indicador ativo */}
              {isActive && (
                <div className="absolute right-0 h-6 w-0.5 rounded-l-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Usuário + Logout ── */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2", collapsed && "justify-center")}>
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-xs font-700 text-white">
            {getInitials(name)}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1 animate-fade-in">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{name}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/40">{ROLE_LABEL[role]}</p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sair"
              className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Toggle collapse ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/50 hover:text-sidebar-foreground shadow-sm transition-colors z-10"
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        <svg className={cn("h-3 w-3 transition-transform duration-300", collapsed && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </aside>
  );
}
