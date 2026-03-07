"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn, getInitials, formatRelativeTime } from "@/lib/utils";

// ─────────────────────────────────────────────
// Notificações mock (substituir por real-time)
// ─────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  { id:"1", title:"Novo ativo cadastrado",       body:"Equipe registrou Bueiro #A14 — Aldeota",     time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),  read:false },
  { id:"2", title:"Obra paralisada — Atenção",   body:"Drenagem Montese aguarda liberação de área", time: new Date(Date.now() - 1000 * 60 * 32).toISOString(), read:false },
  { id:"3", title:"Relatório gerado",            body:"PDF do mês de Junho disponível para download",time: new Date(Date.now() - 1000 * 60 * 90).toISOString(), read:true  },
  { id:"4", title:"Sincronização concluída",     body:"12 registros offline sincronizados com sucesso",time:new Date(Date.now() - 1000 * 60 * 180).toISOString(),read:true },
];

// ─────────────────────────────────────────────
// Breadcrumb automático baseado no pathname
// ─────────────────────────────────────────────
const PATH_LABELS: Record<string, string> = {
  "app":        "Sistema",
  "secretaria": "Secretaria",
  "projetos":   "Projetos GIS",
  "campo":      "Campo",
  "superadmin": "SuperAdmin",
  "tenants":    "Prefeituras",
  "financeiro": "Financeiro",
  "auditoria":  "Auditoria",
  "config":     "Configurações",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: PATH_LABELS[seg] ?? seg,
    href:  "/" + segments.slice(0, i + 1).join("/"),
    last:  i === segments.length - 1,
  }));
}

// ─────────────────────────────────────────────
// Dropdown de notificações
// ─────────────────────────────────────────────
function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState(MOCK_NOTIFICATIONS);
  const unread = notes.filter((n) => !n.read).length;

  const markAll = () => setNotes((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-map z-modal animate-fade-in">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-700 text-foreground">Notificações</span>
          {unread > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-xs text-brand-600 hover:text-brand-500 transition-colors">
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {notes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer",
                !note.read && "bg-brand-50/50"
              )}
              onClick={() => setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, read: true } : n))}
            >
              <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", !note.read ? "bg-brand-500" : "bg-transparent")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-medium text-foreground", !note.read && "font-semibold")}>{note.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{note.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">{formatRelativeTime(note.time)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border px-4 py-2.5">
        <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ver todas as notificações
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dropdown de usuário
// ─────────────────────────────────────────────
function UserDropdown({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-map z-modal animate-fade-in">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <span className="mt-1.5 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
          {user?.role}
        </span>
      </div>

      <div className="p-1.5">
        {[
          { label:"Meu Perfil",         href:"/app/perfil"    },
          { label:"Preferências",       href:"/app/config"    },
          { label:"Suporte",            href:"mailto:suporte@urbandesk.com.br" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className="flex items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-border p-1.5">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sair da plataforma
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Topbar principal
// ─────────────────────────────────────────────
export function Topbar() {
  const { data: session } = useSession();
  const breadcrumbs = useBreadcrumbs();
  const user = session?.user as any;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUser,          setShowUser]          = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUser(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="flex h-topbar-h shrink-0 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-sm">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            {crumb.last ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Ações direita */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Status online */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-dot" />
          Online
        </div>

        {/* Notificações */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifications((v) => !v); setShowUser(false); }}
            className={cn(
              "relative rounded-lg p-2 transition-colors",
              showNotifications ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-border" />

        {/* Avatar + dropdown usuário */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setShowUser((v) => !v); setShowNotifications(false); }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 font-display text-xs font-700 text-white">
              {user?.name ? getInitials(user.name) : "?"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-foreground leading-none">{user?.name?.split(" ")[0]}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.tenantName ?? user?.role}</p>
            </div>
            <svg className="hidden md:block h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showUser && (
            <UserDropdown user={user} onClose={() => setShowUser(false)} />
          )}
        </div>
      </div>
    </header>
  );
}
