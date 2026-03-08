import { prisma } from "@/lib/prisma";
import { formatBRLCompact, formatNumber, formatPercent, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
type TenantStatus = "ATIVO" | "TRIAL" | "INADIMPLENTE" | "CANCELADO";

interface TenantData {
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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ATIVO:        { label: "Ativo",        className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  TRIAL:        { label: "Trial",        className: "bg-brand-100 text-brand-800 border-brand-200" },
  INADIMPLENTE: { label: "Inadimplente", className: "bg-danger-100 text-danger-800 border-danger-200" },
  CANCELADO:    { label: "Cancelado",    className: "bg-slate-100 text-slate-600 border-slate-200" },
};

// ─────────────────────────────────────────────
// Componentes
// ─────────────────────────────────────────────
function KpiCard({ label, value, change, up, icon, color, bg }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-bold text-foreground tabular-num">
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${bg}`}>
          <svg className={`h-6 w-6 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <p className={`mt-4 text-xs font-medium flex items-center gap-1 ${up ? "text-emerald-600" : "text-warning-600"}`}>
        {up ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
        )}
        {change}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page (Server Component Next.js 14)
// ─────────────────────────────────────────────
export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const filterStatus = typeof searchParams.status === "string" ? searchParams.status : "";
  const isModalOpen = searchParams.modal === "new";

  // SERVER ACTION: Criar Nova Prefeitura no Banco
  async function createTenantAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const plan = formData.get("plan") as string;

    if (!name) return;

    let mrr = 890;
    if (plan === "PRO") mrr = 2400;
    if (plan === "ENTERPRISE") mrr = 4800;

    // CORREÇÃO: Geramos um slug e cnpj para não quebrar a obrigatoriedade do banco de dados
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
    const cnpj = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();

    await prisma.tenant.create({
      data: {
        name,
        slug,
        cnpj,
        state: "SP",
        plan: plan as any,
        status: "TRIAL",
        mrr,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias
      }
    });

    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  const whereClause: any = { name: { contains: q, mode: "insensitive" } };
  if (filterStatus) whereClause.status = filterStatus;

  const dbTenants = await prisma.tenant.findMany({
    where: whereClause,
    include: { _count: { select: { users: true, assets: true } } },
    orderBy: { createdAt: "desc" }
  });

  const RECENT_TENANTS: TenantData[] = dbTenants.map((t) => ({
    id: t.id,
    name: t.name,
    state: t.state || "BR", 
    plan: t.plan,
    status: t.status as TenantStatus,
    mrr: Number(t.mrr) || 0,
    users: t._count.users,
    assetsCount: t._count.assets,
    createdAt: t.createdAt.toISOString(),
  }));

  const allTenants = await prisma.tenant.findMany({ select: { mrr: true, status: true, plan: true } });
  
  const mrrTotal = allTenants.reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const ativas = allTenants.filter(t => t.status === "ATIVO").length;
  const inadimplentes = allTenants.filter(t => t.status === "INADIMPLENTE").length;
  const trials = allTenants.filter(t => t.status === "TRIAL").length;

  const mrrEnterprise = allTenants.filter(t => t.plan === "ENTERPRISE").reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const mrrPro        = allTenants.filter(t => t.plan === "PRO").reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const mrrStarter    = allTenants.filter(t => t.plan === "STARTER").reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const divisor = mrrTotal > 0 ? mrrTotal : 1;

  const KPI_DATA = [
    {
      label:  "MRR Total",
      value:  formatBRLCompact(mrrTotal),
      change: "Atualizado em tempo real",
      up:     true,
      icon:   "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      color:  "text-emerald-600",
      bg:     "bg-emerald-50",
    },
    {
      label:  "Prefeituras Ativas",
      value:  ativas.toString(),
      change: `${allTenants.length} cadastradas no total`,
      up:     true,
      icon:   "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      color:  "text-brand-600",
      bg:     "bg-brand-50",
    },
    {
      label:  "Inadimplentes",
      value:  inadimplentes.toString(),
      change: "Requer atenção",
      up:     false,
      icon:   "M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414",
      color:  "text-danger-600",
      bg:     "bg-danger-50",
    },
    {
      label:  "Em Trial",
      value:  trials.toString(),
      change: "Potenciais conversões",
      up:     true,
      icon:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      color:  "text-warning-600",
      bg:     "bg-warning-50",
    },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1600px] mx-auto">

      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Dashboard Executivo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral financeira, infraestrutura e gestão de clientes UrbanDesk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="mailto:suporte@urbandesk.com.br" className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Suporte (12)
          </a>
          <Link href="?modal=new" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Nova Prefeitura
          </Link>
        </div>
      </div>

      {/* KPIs Dinâmicos */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Divisão: Receita, Infraestrutura e Alertas */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Receita por plano */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-5">
            Distribuição de Receita
          </h2>
          <div className="space-y-4">
            {[
              { plan: "Enterprise", mrr: mrrEnterprise, pct: mrrEnterprise / divisor, color: "bg-brand-600" },
              { plan: "Pro",        mrr: mrrPro,        pct: mrrPro / divisor,        color: "bg-brand-400" },
              { plan: "Starter",    mrr: mrrStarter,    pct: mrrStarter / divisor,    color: "bg-brand-200" },
            ].map((row) => (
              <div key={row.plan} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{row.plan}</span>
                  <span className="tabular-num text-muted-foreground font-medium">
                    {formatBRLCompact(row.mrr)} <span className="text-xs text-muted-foreground/60">({formatPercent(row.pct, 1)})</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all duration-500`}
                    style={{ width: `${row.pct * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saúde da Infraestrutura (SaaS) */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-5">
            Saúde da Infraestrutura
          </h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                  Banco de Dados (Supabase)
                </span>
                <span className="tabular-num text-foreground font-bold">12%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-blue-500 w-[12%]" />
              </div>
              <p className="text-xs text-muted-foreground text-right">602 MB de 5 GB</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  Storage de Fotos (R2)
                </span>
                <span className="tabular-num text-amber-600 font-bold">84%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-amber-500 w-[84%]" />
              </div>
              <p className="text-xs text-muted-foreground text-right">8.4 TB de 10 TB</p>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-4">
            Alertas Operacionais
          </h2>
          <div className="space-y-3">
            {[
              {
                type:    "danger",
                message: "Prefeitura de Cuiabá com fatura atrasada há 5 dias",
                action:  "Cobrar",
              },
              {
                type:    "warning",
                message: "Maringá atinge limite do plano Trial amanhã",
                action:  "Fazer Upgrade",
              },
              {
                type:    "info",
                message: "Pico de uso de API detectado em Campinas",
                action:  "Ver Logs",
              },
            ].map((alert, i) => {
              const styles = {
                warning: "border-warning-200 bg-warning-50 text-warning-800",
                danger:  "border-danger-200 bg-danger-50 text-danger-800",
                info:    "border-brand-200 bg-brand-50 text-brand-800",
              }[alert.type];
              return (
                <div key={i} className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${styles}`}>
                  <p className="text-xs font-medium leading-relaxed">{alert.message}</p>
                  <button className="shrink-0 text-xs font-bold underline-offset-2 hover:underline bg-white/50 px-2 py-1 rounded">
                    {alert.action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabela de Gestão de Clientes */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        
        {/* Cabeçalho da Tabela com Busca e Filtros */}
        <div className="border-b border-border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Gestão de Prefeituras (Tenants)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Gerencie acessos, planos e suporte técnico.</p>
            </div>
            
            <form action="/superadmin" method="GET" className="flex items-center gap-2">
              {/* Preserva o status atual na busca */}
              {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
              <input 
                type="text" 
                name="q"
                defaultValue={q}
                placeholder="Buscar cidade..." 
                className="px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button type="submit" className="text-sm font-medium text-brand-600 hover:text-brand-500 px-3 py-1.5 border border-transparent hover:bg-brand-50 rounded-md transition-colors">
                Buscar
              </button>
            </form>
          </div>

          {/* Abas de Filtro Funcionais */}
          <div className="flex items-center gap-2 text-sm border-t border-border pt-4">
            <Link 
              href="?" 
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${!filterStatus ? "bg-background shadow-sm border border-border text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Todos
            </Link>
            <Link 
              href="?status=ATIVO" 
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${filterStatus === "ATIVO" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-muted-foreground hover:text-foreground"}`}
            >
              Ativos
            </Link>
            <Link 
              href="?status=TRIAL" 
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${filterStatus === "TRIAL" ? "bg-brand-50 text-brand-700 border border-brand-200" : "text-muted-foreground hover:text-foreground"}`}
            >
              Trial
            </Link>
            <Link 
              href="?status=INADIMPLENTE" 
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${filterStatus === "INADIMPLENTE" ? "bg-danger-50 text-danger-700 border border-danger-200" : "text-muted-foreground hover:text-foreground"}`}
            >
              Inadimplentes
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Município", "Plano", "Status", "MRR", "Usuários", "Ativos GIS", "Ações Técnicas"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TENANTS.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhuma prefeitura encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                RECENT_TENANTS.map((tenant) => {
                  const s = STATUS_STYLES[tenant.status] || STATUS_STYLES.CANCELADO;
                  return (
                    <tr key={tenant.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.state} • Cadastrado {formatRelativeTime(tenant.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.className}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 tabular-num font-medium text-foreground">
                        {tenant.mrr === 0 ? "—" : formatBRLCompact(tenant.mrr)}
                      </td>
                      <td className="px-6 py-4 tabular-num text-muted-foreground">
                        {formatNumber(tenant.users)}
                      </td>
                      <td className="px-6 py-4 tabular-num text-muted-foreground">
                        {formatNumber(tenant.assetsCount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold">
                        <button className="text-brand-600 hover:text-brand-800 mr-4 transition-colors">
                          Editar Tenant
                        </button>
                        <Link href={`/api/auth/impersonate?tenantId=${tenant.id}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                          Acessar como...
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL NOVA PREFEITURA ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl relative overflow-hidden">
            <h3 className="font-display text-xl font-bold text-foreground mb-1">Cadastrar Nova Prefeitura</h3>
            <p className="text-sm text-muted-foreground mb-6">O ambiente será gerado imediatamente no banco de dados.</p>
            
            <form action={createTenantAction} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Nome do Município *</label>
                <input 
                  name="name" type="text" required placeholder="Ex: Prefeitura de São Paulo"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Plano Assinado *</label>
                <select name="plan" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 transition-all">
                  <option value="STARTER">Starter (R$ 890/mês)</option>
                  <option value="PRO">Pro (R$ 2.400/mês)</option>
                  <option value="ENTERPRISE">Enterprise (Sob Consulta)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancelar
                </Link>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm">
                  Gerar Ambiente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}