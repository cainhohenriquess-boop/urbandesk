import { prisma } from "@/lib/prisma";
import { formatBRLCompact, formatNumber, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────
// Força a página a ser dinâmica (evita erros de cache da Vercel)
// ─────────────────────────────────────────────
export const dynamic = "force-dynamic";

type TenantStatus = "ATIVO" | "TRIAL" | "INADIMPLENTE" | "CANCELADO";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ATIVO:        { label: "Ativo",        className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  TRIAL:        { label: "Trial",        className: "bg-brand-100 text-brand-800 border-brand-200" },
  INADIMPLENTE: { label: "Inadimplente", className: "bg-danger-100 text-danger-800 border-danger-200" },
  CANCELADO:    { label: "Cancelado",    className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function KpiCard({ label, value, change, up, icon, color, bg }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold text-foreground tabular-num">{value}</p>
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

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // 1. Defesa contra searchParams nulo
  const safeParams = searchParams || {};
  const q = typeof safeParams.q === "string" ? safeParams.q : "";
  const filterStatus = typeof safeParams.status === "string" ? safeParams.status : "";
  const isModalOpen = safeParams.modal === "new";

  // 2. SERVER ACTION (Protegida)
  async function createTenantAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const plan = formData.get("plan") as string;

    if (!name) return;

    let mrr = 890;
    if (plan === "PRO") mrr = 2400;
    if (plan === "ENTERPRISE") mrr = 4800;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
    const cnpj = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();

    await prisma.tenant.create({
      data: {
        name, slug, cnpj, state: "SP", plan: plan as any, status: "TRIAL", mrr,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }
    });

    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  // 3. BLOCO TRY-CATCH DE RESILIÊNCIA
  let dbTenants: any[] = [];
  let allTenants: any[] = [];
  let dbError = null;

  try {
    const whereClause: any = { name: { contains: q, mode: "insensitive" } };
    if (filterStatus) whereClause.status = filterStatus;

    dbTenants = await prisma.tenant.findMany({
      where: whereClause,
      include: { _count: { select: { users: true, assets: true } } },
      orderBy: { createdAt: "desc" }
    });

    allTenants = await prisma.tenant.findMany({ 
      select: { mrr: true, status: true, plan: true } 
    });
  } catch (error: any) {
    console.error("ERRO NO BANCO DE DADOS (SuperAdmin):", error);
    dbError = error.message;
  }

  // SE HOUVE ERRO, MOSTRA NA TELA EM VEZ DE QUEBRAR O SERVIDOR (Erro 500)
  if (dbError) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-10">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span>⚠️</span> Erro de Conexão com o Banco de Dados
          </h2>
          <p className="text-sm mb-4">O Prisma encontrou uma falha ao tentar carregar a lista de Prefeituras. O erro exato retornado foi:</p>
          <pre className="bg-red-900/10 p-4 rounded text-xs font-mono overflow-auto">{dbError}</pre>
          <p className="text-sm mt-4 text-red-600 font-medium">Copie este erro e envie para a análise!</p>
        </div>
      </div>
    );
  }

  // 4. Mapeamento Seguro de Dados
  const RECENT_TENANTS = dbTenants.map((t) => ({
    id: t.id,
    name: t.name || "Sem Nome",
    state: t.state || "BR", 
    plan: t.plan || "STARTER",
    status: (t.status || "CANCELADO") as TenantStatus,
    mrr: Number(t.mrr) || 0,
    users: t._count?.users || 0,
    assetsCount: t._count?.assets || 0,
    // Data formatada de forma nativa e ultra segura
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : "Data desconhecida",
  }));

  const mrrTotal = allTenants.reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const ativas = allTenants.filter(t => t.status === "ATIVO").length;
  const inadimplentes = allTenants.filter(t => t.status === "INADIMPLENTE").length;
  const trials = allTenants.filter(t => t.status === "TRIAL").length;

  const mrrEnterprise = allTenants.filter(t => t.plan === "ENTERPRISE").reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const mrrPro        = allTenants.filter(t => t.plan === "PRO").reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const mrrStarter    = allTenants.filter(t => t.plan === "STARTER").reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const divisor = mrrTotal > 0 ? mrrTotal : 1;

  const KPI_DATA = [
    { label: "MRR Total", value: formatBRLCompact(mrrTotal), change: "Atualizado em tempo real", up: true, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Prefeituras Ativas", value: ativas.toString(), change: `${allTenants.length} cadastradas no total`, up: true, icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Inadimplentes", value: inadimplentes.toString(), change: "Requer atenção", up: false, icon: "M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414", color: "text-danger-600", bg: "bg-danger-50" },
    { label: "Em Trial", value: trials.toString(), change: "Potenciais conversões", up: true, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-warning-600", bg: "bg-warning-50" },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão geral financeira, infraestrutura e gestão de clientes UrbanDesk.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="?modal=new" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Nova Prefeitura
          </Link>
        </div>
      </div>

      {/* KPIs Dinâmicos */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Receita por plano */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-5">Distribuição de Receita</h2>
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
                  <div className={`h-full rounded-full ${row.color} transition-all duration-500`} style={{ width: `${row.pct * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saúde da Infraestrutura */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-5">Saúde da Infraestrutura</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Banco de Dados</span>
                <span className="tabular-num text-foreground font-bold">12%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-blue-500 w-[12%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-4">Alertas Operacionais</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            Monitoramento de instâncias ativado. Sem alertas críticos no momento.
          </div>
        </div>
      </div>

      {/* Tabela de Gestão de Clientes */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-display text-base font-bold text-foreground">Gestão de Prefeituras (Tenants)</h2>
            <form action="/superadmin" method="GET" className="flex items-center gap-2">
              {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
              <input type="text" name="q" defaultValue={q} placeholder="Buscar cidade..." className="px-3 py-1.5 text-sm border border-border rounded-md bg-background" />
              <button type="submit" className="text-sm font-medium text-brand-600 px-3 py-1.5 border border-transparent rounded-md hover:bg-brand-50 transition-colors">Buscar</button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Município", "Plano", "Status", "MRR", "Usuários", "Ativos", "Ações"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TENANTS.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Nenhuma prefeitura encontrada.</td></tr>
              ) : (
                RECENT_TENANTS.map((tenant) => {
                  const s = STATUS_STYLES[tenant.status] || STATUS_STYLES.CANCELADO;
                  return (
                    <tr key={tenant.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.state} • {tenant.createdAt}</p>
                      </td>
                      <td className="px-6 py-4"><span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">{tenant.plan}</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.className}`}>{s.label}</span></td>
                      <td className="px-6 py-4 tabular-num font-medium text-foreground">{tenant.mrr === 0 ? "—" : formatBRLCompact(tenant.mrr)}</td>
                      <td className="px-6 py-4 tabular-num text-muted-foreground">{formatNumber(tenant.users)}</td>
                      <td className="px-6 py-4 tabular-num text-muted-foreground">{formatNumber(tenant.assetsCount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link href={`/api/auth/impersonate?tenantId=${tenant.id}`} className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md">Acessar</Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl relative overflow-hidden">
            <h3 className="font-display text-xl font-bold text-foreground mb-1">Cadastrar Nova Prefeitura</h3>
            <form action={createTenantAction} className="space-y-5 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Nome do Município *</label>
                <input name="name" type="text" required placeholder="Ex: Prefeitura de São Paulo" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Plano Assinado *</label>
                <select name="plan" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500">
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</Link>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Gerar Ambiente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}