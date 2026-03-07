import { formatBRLCompact, formatNumber, formatPercent, formatRelativeTime } from "@/lib/utils";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
type TenantStatus = "ATIVO" | "TRIAL" | "INADIMPLENTE" | "CANCELADO";

interface Tenant {
  id: string;
  name: string;
  state: string;
  plan: string;
  status: TenantStatus;
  mrr: number;
  users: number;
  assetsCount: number;
  trialEndsAt?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Mock data (substituir por prisma queries)
// ─────────────────────────────────────────────
const KPI_DATA = [
  {
    label:  "MRR Total",
    value:  formatBRLCompact(284_000),
    change: "+12,4%",
    up:     true,
    icon:   "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color:  "text-accent-600",
    bg:     "bg-accent-50",
  },
  {
    label:  "Prefeituras Ativas",
    value:  "143",
    change: "+8 este mês",
    up:     true,
    icon:   "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    color:  "text-brand-600",
    bg:     "bg-brand-50",
  },
  {
    label:  "Churn Rate",
    value:  "1,8%",
    change: "-0,3 p.p.",
    up:     true,
    icon:   "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
    color:  "text-accent-600",
    bg:     "bg-accent-50",
  },
  {
    label:  "Em Trial",
    value:  "22",
    change: "7 vencem hoje",
    up:     false,
    icon:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    color:  "text-warning-600",
    bg:     "bg-warning-50",
  },
];

const RECENT_TENANTS: Tenant[] = [
  {
    id: "1",
    name: "Prefeitura de Campinas",
    state: "SP",
    plan: "Enterprise",
    status: "ATIVO",
    mrr: 4_800,
    users: 34,
    assetsCount: 2_412,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "2",
    name: "Prefeitura de Maringá",
    state: "PR",
    plan: "Pro",
    status: "TRIAL",
    mrr: 0,
    users: 5,
    assetsCount: 87,
    trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "3",
    name: "Prefeitura de Fortaleza",
    state: "CE",
    plan: "Enterprise",
    status: "ATIVO",
    mrr: 9_600,
    users: 78,
    assetsCount: 8_901,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "4",
    name: "Prefeitura de Cuiabá",
    state: "MT",
    plan: "Pro",
    status: "INADIMPLENTE",
    mrr: 2_400,
    users: 12,
    assetsCount: 654,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    id: "5",
    name: "Prefeitura de Joinville",
    state: "SC",
    plan: "Starter",
    status: "ATIVO",
    mrr: 890,
    users: 6,
    assetsCount: 211,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
];

const STATUS_STYLES: Record<TenantStatus, { label: string; className: string }> = {
  ATIVO:        { label: "Ativo",        className: "bg-accent-100 text-accent-700" },
  TRIAL:        { label: "Trial",        className: "bg-brand-100 text-brand-700" },
  INADIMPLENTE: { label: "Inadimplente", className: "bg-danger-100 text-danger-700" },
  CANCELADO:    { label: "Cancelado",    className: "bg-slate-100 text-slate-500" },
};

// ─────────────────────────────────────────────
// Componentes
// ─────────────────────────────────────────────
function KpiCard({
  label, value, change, up, icon, color, bg,
}: typeof KPI_DATA[0]) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-700 text-foreground tabular-num">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
          <svg className={`h-5 w-5 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <p className={`mt-3 text-xs font-medium ${up ? "text-accent-600" : "text-warning-600"}`}>
        {change}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page (Server Component)
// ─────────────────────────────────────────────
export default function SuperAdminPage() {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-700 text-foreground">
          Painel do Proprietário
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral financeira e gestão de municípios da plataforma UrbanDesk.
        </p>
      </div>

      {/* KPIs */}
      <div className="dashboard-grid">
        {KPI_DATA.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Divisão: Receita por plano + Atividade recente */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Receita por plano */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm font-700 text-foreground mb-4">
            Receita por Plano
          </h2>
          <div className="space-y-3">
            {[
              { plan: "Enterprise", mrr: 189_600, pct: 0.668, color: "bg-brand-600" },
              { plan: "Pro",        mrr:  72_400, pct: 0.255, color: "bg-brand-400" },
              { plan: "Starter",    mrr:  22_000, pct: 0.077, color: "bg-brand-200" },
            ].map((row) => (
              <div key={row.plan} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{row.plan}</span>
                  <span className="tabular-num text-muted-foreground">
                    {formatBRLCompact(row.mrr)} · {formatPercent(row.pct, 1)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all duration-500`}
                    style={{ width: `${row.pct * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">ARR Projetado</span>
              <span className="font-display text-sm font-700 text-foreground tabular-num">
                {formatBRLCompact(284_000 * 12)}
              </span>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm font-700 text-foreground mb-4">
            Alertas Operacionais
          </h2>
          <div className="space-y-2.5">
            {[
              {
                type:    "warning",
                message: "7 trials vencem nos próximos 3 dias",
                action:  "Ver trials",
                href:    "/superadmin/tenants?filter=trial",
              },
              {
                type:    "danger",
                message: "4 prefeituras com pagamento em atraso",
                action:  "Ver inadimplentes",
                href:    "/superadmin/financeiro?filter=inadimplente",
              },
              {
                type:    "info",
                message: "Novo município aguarda aprovação",
                action:  "Revisar",
                href:    "/superadmin/tenants?filter=pending",
              },
            ].map((alert, i) => {
              const styles = {
                warning: "border-warning-200 bg-warning-50 text-warning-700",
                danger:  "border-danger-200 bg-danger-50 text-danger-700",
                info:    "border-brand-200 bg-brand-50 text-brand-700",
              }[alert.type];
              return (
                <div
                  key={i}
                  className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${styles}`}
                >
                  <p className="text-xs leading-relaxed">{alert.message}</p>
                  <a
                    href={alert.href}
                    className="shrink-0 text-xs font-medium underline underline-offset-2 hover:no-underline"
                  >
                    {alert.action}
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top municípios por receita */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm font-700 text-foreground mb-4">
            Top Municípios · MRR
          </h2>
          <div className="space-y-2.5">
            {[
              { name: "Fortaleza, CE",  mrr: 9_600,  rank: 1 },
              { name: "Campinas, SP",   mrr: 4_800,  rank: 2 },
              { name: "Manaus, AM",     mrr: 4_200,  rank: 3 },
              { name: "Goiânia, GO",    mrr: 3_600,  rank: 4 },
              { name: "São Luís, MA",   mrr: 2_800,  rank: 5 },
            ].map((city) => (
              <div key={city.name} className="flex items-center gap-3">
                <span className="font-display text-xs font-700 tabular-num text-muted-foreground w-4 text-right">
                  {city.rank}
                </span>
                <span className="flex-1 text-xs text-foreground truncate">{city.name}</span>
                <span className="font-display text-xs font-700 tabular-num text-foreground">
                  {formatBRLCompact(city.mrr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de prefeituras recentes */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-sm font-700 text-foreground">
            Prefeituras — Atividade Recente
          </h2>
          <a
            href="/superadmin/tenants"
            className="text-xs font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            Ver todas →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Município", "Estado", "Plano", "Status", "MRR", "Usuários", "Ativos GIS", "Cadastro"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TENANTS.map((tenant) => {
                const s = STATUS_STYLES[tenant.status];
                return (
                  <tr
                    key={tenant.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">
                      {tenant.name}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {tenant.state}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`status-badge ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 tabular-num text-foreground">
                      {tenant.mrr === 0 ? "—" : formatBRLCompact(tenant.mrr)}
                    </td>
                    <td className="px-5 py-3.5 tabular-num text-muted-foreground">
                      {formatNumber(tenant.users)}
                    </td>
                    <td className="px-5 py-3.5 tabular-num text-muted-foreground">
                      {formatNumber(tenant.assetsCount)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(tenant.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
