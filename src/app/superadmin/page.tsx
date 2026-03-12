import { prisma } from "@/lib/prisma";
import { formatBRLCompact, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccessBlockReason } from "@/lib/auth-shared";

// ─────────────────────────────────────────────
// Força a página a ser dinâmica (evita cache da Vercel)
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
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const safeParams = (await searchParams) || {};
  const q = typeof safeParams.q === "string" ? safeParams.q : "";
  const filterStatus = typeof safeParams.status === "string" ? safeParams.status : "";
  
  const isModalOpen = safeParams.modal === "new";
  const isUploadModalOpen = safeParams.modal === "upload";
  const isDeleteModalOpen = safeParams.modal === "delete"; // NOVO: Flag para o modal de exclusão
  
  const targetTenantId = typeof safeParams.tenantId === "string" ? safeParams.tenantId : null;
  const targetTenantName = typeof safeParams.tenantName === "string" ? safeParams.tenantName : "esta prefeitura";

  // ─────────────────────────────────────────────
  // SERVER ACTION 1: Criar Prefeitura + Robô OSM
  // ─────────────────────────────────────────────
  async function createTenantAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPERADMIN") redirect("/login?error=unauthorized");
    const reason = getAccessBlockReason(session.user);
    if (reason) redirect(`/login?error=${reason}`);

    const name = formData.get("name") as string;
    const state = formData.get("state") as string;
    const plan = formData.get("plan") as string;
    const rawPassword = formData.get("password") as string;

    if (!name || !state || !rawPassword) return;

    let mrr = 890;
    if (plan === "PRO") mrr = 2400;
    if (plan === "ENTERPRISE") mrr = 4800;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const cnpj = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();

    const tenant = await prisma.tenant.create({
      data: { 
        name, slug, cnpj, state, plan: plan as any, status: "TRIAL", mrr, 
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) 
      }
    });

    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(name)}&state=${encodeURIComponent(state)}&country=Brazil&polygon_geojson=1&format=json`;
      const osmRes = await fetch(osmUrl, { headers: { "User-Agent": "UrbanDesk-Enterprise-GIS/1.0" }});
      const osmData = await osmRes.json();

      if (osmData && osmData.length > 0 && osmData[0].geojson) {
        const geojsonFeature = {
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: osmData[0].geojson, properties: { name: name } }]
        };
        await prisma.baseLayer.create({
          data: { name: "Limite Municipal (OSM)", type: "BOUNDARY", tenantId: tenant.id, geoJsonData: geojsonFeature as any }
        });
      }
    } catch (e) {
      console.error("Erro ao puxar limite do OSM:", e);
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const usersToCreate = [
      { name: "Engenharia", email: `engenheiro@${slug}`, role: "ENGENHEIRO", tenantId: tenant.id, passwordHash },
      { name: "Secretaria", email: `secretario@${slug}`, role: "SECRETARIO", tenantId: tenant.id, passwordHash },
      { name: "Equipe de Campo", email: `campo@${slug}`, role: "CAMPO", tenantId: tenant.id, passwordHash },
    ];

    await prisma.user.createMany({ data: usersToCreate as any });

    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  // ─────────────────────────────────────────────
  // SERVER ACTION 2: Upload de Shapefiles
  // ─────────────────────────────────────────────
  async function uploadShapefileAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPERADMIN") redirect("/login?error=unauthorized");
    const reason = getAccessBlockReason(session.user);
    if (reason) redirect(`/login?error=${reason}`);

    try {
      const shp = (await import("shpjs")).default;
      const file = formData.get("file") as File;
      const tenantId = formData.get("tenantId") as string;
      const name = formData.get("name") as string;
      const type = formData.get("type") as string;

      if (!file || !tenantId || file.size === 0) return;

      const buffer = await file.arrayBuffer();
      const geojson = await shp(buffer);
      const geoJsonData = Array.isArray(geojson) ? geojson[0] : geojson;

      await prisma.baseLayer.create({
        data: { name, type, tenantId, geoJsonData: geoJsonData as any }
      });
    } catch (error: any) {
      console.error("ERRO GRAVE SHAPEFILE:", error);
    }
    
    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  // ─────────────────────────────────────────────
  // SERVER ACTION 3: Excluir Prefeitura
  // ─────────────────────────────────────────────
  async function deleteTenantAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPERADMIN") redirect("/login?error=unauthorized");
    const reason = getAccessBlockReason(session.user);
    if (reason) redirect(`/login?error=${reason}`);

    const tenantId = formData.get("tenantId") as string;
    if (!tenantId) return;

    // Graças ao onDelete: Cascade no schema.prisma, isso apaga TUDO (users, assets, etc)
    await prisma.tenant.delete({
      where: { id: tenantId }
    });

    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  // ─────────────────────────────────────────────
  // Consultas ao Banco
  // ─────────────────────────────────────────────
  let dbTenants: any[] = [];
  let allTenants: any[] = [];
  let dbError = null;

  try {
    const whereClause: any = { name: { contains: q, mode: "insensitive" } };
    if (filterStatus) whereClause.status = filterStatus;

    dbTenants = await prisma.tenant.findMany({
      where: whereClause,
      include: { 
        _count: { select: { users: true, assets: true } },
        baseLayers: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    allTenants = await prisma.tenant.findMany({ 
      select: { mrr: true, status: true, plan: true } 
    });
  } catch (error: any) {
    dbError = error.message;
  }

  if (dbError) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-10 bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><span>⚠️</span> Erro de Conexão com o Banco de Dados</h2>
        <p className="text-sm mb-4">O Prisma encontrou uma falha ao tentar carregar a lista de Prefeituras. Erro retornado:</p>
        <pre className="bg-red-900/10 p-4 rounded text-xs font-mono overflow-auto">{dbError}</pre>
      </div>
    );
  }

  const RECENT_TENANTS = dbTenants.map((t) => ({
    id: t.id,
    name: t.name || "Sem Nome",
    state: t.state || "BR", 
    slug: t.slug,
    plan: t.plan || "STARTER",
    status: (t.status || "CANCELADO") as TenantStatus,
    mrr: Number(t.mrr) || 0,
    users: t._count?.users || 0,
    assetsCount: t._count?.assets || 0,
    layersCount: t.baseLayers?.length || 0,
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : "-",
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão geral financeira, infraestrutura e gestão de clientes UrbanDesk.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="?modal=new" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nova Prefeitura
          </Link>
        </div>
      </div>

      {/* ── KPIs e Gráficos ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
                  <span className="tabular-num text-muted-foreground font-medium">{formatBRLCompact(row.mrr)} <span className="text-xs text-muted-foreground/60">({formatPercent(row.pct, 1)})</span></span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${row.color} transition-all duration-500`} style={{ width: `${row.pct * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-5">Saúde da Infraestrutura</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2"><svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg> Banco de Dados</span>
                <span className="tabular-num text-foreground font-bold">12%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-blue-500 w-[12%]" /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2"><svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg> Storage (Shapefiles e Fotos)</span>
                <span className="tabular-num text-amber-600 font-bold">84%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-amber-500 w-[84%]" /></div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-4">Alertas Operacionais</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-warning-200 bg-warning-50 text-warning-800 p-3.5">
              <p className="text-xs font-medium leading-relaxed">Pico de conversão de Shapefiles detectado.</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 text-brand-800 p-3.5">
              <p className="text-xs font-medium leading-relaxed">Sistema Operacional em Estado Normal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabela Completa ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Gestão de Prefeituras (Tenants)</h2>
              <p className="text-xs text-muted-foreground mt-1">Gerencie acessos, planos e as camadas cartográficas GIS.</p>
            </div>
            <form action="/superadmin" method="GET" className="flex items-center gap-2">
              {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
              <input type="text" name="q" defaultValue={q} placeholder="Buscar cidade..." className="px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
              <button type="submit" className="text-sm font-medium text-brand-600 px-3 py-1.5 hover:bg-brand-50 rounded-md transition-colors">Buscar</button>
            </form>
          </div>
          <div className="flex items-center gap-2 text-sm border-t border-border pt-4">
            <Link href="?" className={`px-3 py-1.5 rounded-md font-medium transition-colors ${!filterStatus ? "bg-background shadow-sm border border-border text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Todos</Link>
            <Link href="?status=ATIVO" className={`px-3 py-1.5 rounded-md font-medium transition-colors ${filterStatus === "ATIVO" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-muted-foreground hover:text-foreground"}`}>Ativos</Link>
            <Link href="?status=TRIAL" className={`px-3 py-1.5 rounded-md font-medium transition-colors ${filterStatus === "TRIAL" ? "bg-brand-50 text-brand-700 border border-brand-200" : "text-muted-foreground hover:text-foreground"}`}>Trial</Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Município", "Status", "Usuários Logins", "Camadas", "Ações Técnicas"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TENANTS.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhuma prefeitura encontrada para este filtro.</td></tr>
              ) : (
                RECENT_TENANTS.map((tenant) => {
                  const s = STATUS_STYLES[tenant.status] || STATUS_STYLES.CANCELADO;
                  return (
                    <tr key={tenant.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-foreground">{tenant.name} - {tenant.state}</p>
                        <p className="text-xs text-muted-foreground">Criado em {tenant.createdAt}</p>
                      </td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.className}`}>{s.label}</span></td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        engenheiro@{tenant.slug} <br/> secretario@{tenant.slug}
                      </td>
                      <td className="px-6 py-4 tabular-num font-bold text-brand-600">{tenant.layersCount} Camadas</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold flex justify-end gap-2 items-center h-[72px]">
                        
                        {/* NOVO: Botão de Excluir */}
                        <Link 
                          href={`?modal=delete&tenantId=${tenant.id}&tenantName=${encodeURIComponent(tenant.name)}`} 
                          className="text-danger-600 hover:text-danger-700 bg-danger-50 hover:bg-danger-100 p-2 rounded-md transition-colors"
                          title="Excluir Prefeitura"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </Link>

                        <Link href={`?modal=upload&tenantId=${tenant.id}`} className="text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Subir Mapa
                        </Link>
                        <Link href={`/api/auth/impersonate?tenantId=${tenant.id}`} className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                          Acessar <span className="text-lg leading-none">→</span>
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

      {/* ── MODAL 1: CRIAR NOVA PREFEITURA E USUÁRIOS ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl relative overflow-hidden">
            <h3 className="font-display text-xl font-bold text-foreground mb-1">Cadastrar Nova Prefeitura</h3>
            <p className="text-xs text-muted-foreground mb-4">A plataforma buscará o limite municipal no OpenStreetMap automaticamente e criará os acessos.</p>
            
            <form action={createTenantAction} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Cidade *</label>
                  <input name="name" type="text" required placeholder="Ex: Fortaleza" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 transition-all" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Estado (UF) *</label>
                  <input name="state" type="text" required maxLength={2} placeholder="Ex: CE" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 uppercase transition-all" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Senha Padrão da Equipe *</label>
                <input name="password" type="text" required placeholder="Ex: SenhaForte123!" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Plano Assinado *</label>
                <select name="plan" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 transition-all">
                  <option value="STARTER">Starter (R$ 890/mês)</option>
                  <option value="PRO">Pro (R$ 2.400/mês)</option>
                  <option value="ENTERPRISE">Enterprise (Sob Consulta)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</Link>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 shadow-sm transition-colors">Gerar Tudo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: UPLOAD DE SHAPEFILE ── */}
      {isUploadModalOpen && targetTenantId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-brand-500/30 bg-card p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-brand-100 text-brand-600 p-2 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Importar Base GIS</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Envie o arquivo ZIP contendo as extensões (.shp, .dbf, .shx) para compilar a cartografia.</p>
            
            <form action={uploadShapefileAction} className="space-y-5">
              <input type="hidden" name="tenantId" value={targetTenantId} />
              
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Nome da Camada</label>
                <input name="name" type="text" required placeholder="Ex: Malha Viária Centro" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Tipo de Geografia</label>
                <select name="type" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-all">
                  <option value="BOUNDARY">Limites do Município / Setores (Polígonos)</option>
                  <option value="STREETS">Formato das Ruas / Buffers (Polígonos)</option>
                  <option value="STREET_NAMES">Nomes das Ruas (Linhas com coluna &apos;name&apos;)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-600 mb-1.5">Arquivo Shapefile (.zip) *</label>
                <input name="file" type="file" accept=".zip" required className="w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 file:cursor-pointer cursor-pointer border border-dashed border-border p-2 rounded-lg" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</Link>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 shadow-md transition-colors">
                  Processar Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EXCLUIR PREFEITURA (LIXEIRA) ── */}
      {isDeleteModalOpen && targetTenantId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-danger-500/30 bg-card p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-danger-100 text-danger-600 p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Excluir Prefeitura</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Você está prestes a apagar <strong>{targetTenantName}</strong>. Esta ação excluirá automaticamente todos os usuários, senhas, shapefiles e mapas salvos associados a este município. <span className="text-danger-600 font-bold">Esta ação é irreversível.</span>
            </p>
            
            <form action={deleteTenantAction}>
              <input type="hidden" name="tenantId" value={targetTenantId} />
              
              <div className="flex gap-3 pt-4 border-t border-border">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancelar
                </Link>
                <button type="submit" className="flex-1 rounded-lg bg-danger-600 py-2.5 text-sm font-bold text-white hover:bg-danger-700 shadow-md transition-colors">
                  Sim, excluir tudo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
