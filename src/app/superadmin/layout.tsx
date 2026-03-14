import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAccessBlockReason } from "@/lib/auth-shared";

// ─────────────────────────────────────────────
// Ícones
// ─────────────────────────────────────────────
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href:  "/superadmin",
    icon:  "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    label: "Prefeituras",
    href:  "/superadmin/tenants",
    icon:  "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    label: "Camadas",
    href: "/superadmin/camadas",
    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  },
  {
    label: "Financeiro",
    href:  "/superadmin/financeiro",
    icon:  "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    label: "Planos",
    href:  "/superadmin/planos",
    icon:  "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
  {
    label: "Auditoria",
    href:  "/superadmin/auditoria",
    icon:  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    label: "Configurações",
    href:  "/superadmin/config",
    icon:  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

// ─────────────────────────────────────────────
// Layout SuperAdmin (Server Component)
// ─────────────────────────────────────────────
export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Proteção server-side (middleware já bloqueia, mas camada dupla é boa prática)
  if (!session || (session.user as any)?.role !== "SUPERADMIN") {
    redirect("/login?error=unauthorized");
  }

  const user = session.user as any;
  const accessReason = getAccessBlockReason(user);
  if (accessReason) {
    redirect(`/login?error=${accessReason}`);
  }

  return (
    <div className="app-shell">

      {/* ── Sidebar SuperAdmin ── */}
      <aside className="flex w-sidebar-w flex-col border-r border-sidebar-border bg-sidebar shadow-sidebar">

        {/* Logo */}
        <div className="flex h-topbar-h shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 shrink-0">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-700 text-sidebar-foreground tracking-tight">
              UrbanDesk
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-brand-400">
              SuperAdmin
            </p>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                // Active state via aria-current seria ideal com usePathname no client
              )}
            >
              <Icon path={item.icon} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Separador + usuário */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-700 text-white font-display">
              {user?.name
                ? user.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")
                : "SA"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                {user?.name ?? "Super Admin"}
              </p>
              <p className="truncate text-[10px] text-sidebar-foreground/50">
                {user?.email}
              </p>
            </div>
            {/* Badge role */}
            <span className="shrink-0 rounded-full bg-brand-900/60 px-2 py-0.5 text-[10px] font-medium text-brand-400">
              OWNER
            </span>
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="app-content">
        {/* Topbar */}
        <header className="flex h-topbar-h shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>UrbanDesk</span>
            <span>/</span>
            <span className="font-medium text-foreground">Painel do Proprietário</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicador live */}
            <div className="flex items-center gap-1.5 text-xs text-accent-600">
              <span className="h-2 w-2 rounded-full bg-accent-500 animate-pulse-dot" />
              Sistema operacional
            </div>
          </div>
        </header>

        {/* Página */}
        <main className="app-main animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
