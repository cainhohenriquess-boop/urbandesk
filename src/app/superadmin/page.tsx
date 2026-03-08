import { prisma } from "@/lib/prisma";
import { formatBRLCompact, formatNumber, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────
// Força a página a ser dinâmica e desativa o cache rígido
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
  const safeParams = searchParams || {};
  const q = typeof safeParams.q === "string" ? safeParams.q : "";
  const filterStatus = typeof safeParams.status === "string" ? safeParams.status : "";
  
  const isModalOpen = safeParams.modal === "new";
  const isUploadModalOpen = safeParams.modal === "upload";
  const targetTenantId = typeof safeParams.tenantId === "string" ? safeParams.tenantId : null;

  // ─────────────────────────────────────────────
  // SERVER ACTION: Criar Nova Prefeitura
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // SERVER ACTION: Upload de Shapefile Zipado (Enterprise GIS)
  // ─────────────────────────────────────────────
  async function uploadShapefileAction(formData: FormData) {
    "use server";
    try {
      // Import dinâmico para garantir compatibilidade com o runtime da Vercel
      const shp = (await import("shpjs")).default;
      
      const file = formData.get("file") as File;
      const tenantId = formData.get("tenantId") as string;
      const name = formData.get("name") as string;
      const type = formData.get("type") as string; // BOUNDARY ou STREETS

      if (!file || !tenantId || file.size === 0) return;

      // Converte o arquivo da requisição em Buffer binário
      const buffer = await file.arrayBuffer();

      // MÁGICA: A engine SHPJS extrai o .zip e compila para GeoJSON instantaneamente
      const geojson = await shp(buffer);

      // Em alguns casos o zip tem múltiplos shapefiles, pegamos o primeiro (ou o consolidado)
      const geoJsonData = Array.isArray(geojson) ? geojson[0] : geojson;

      // Salva no PostgreSQL
      await prisma.baseLayer.create({
        data: {
          name,
          type,
          tenantId,
          geoJsonData: geoJsonData as any,
        }
      });

    } catch (error: any) {
      console.error("ERRO GRAVE NO PROCESSAMENTO DO SHAPEFILE:", error);
    }
    
    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  // ─────────────────────────────────────────────
  // Consultas de Banco de Dados Blindadas
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
        baseLayers: { select: { id: true } } // Conta os shapefiles
      },
      orderBy: { createdAt: "desc" }
    });

    allTenants = await prisma.tenant.findMany({ select: { mrr: true, status: true, plan: true } });
  } catch (error: any) {
    console.error("ERRO NO BANCO (SuperAdmin):", error);
    dbError = error.message;
  }

  if (dbError) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-10 bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-2">⚠️ Erro de Banco de Dados</h2>
        <pre className="bg-red-900/10 p-4 rounded text-xs font-mono overflow-auto">{dbError}</pre>
      </div>
    );
  }

  const RECENT_TENANTS = dbTenants.map((t) => ({
    id: t.id,
    name: t.name || "Sem Nome",
    state: t.state || "BR", 
    plan: t.plan || "STARTER",
    status: (t.status || "CANCELADO") as TenantStatus,
    mrr: Number(t.mrr) || 0,
    users: t._count?.users || 0,
    assetsCount: t._count?.assets || 0,
    layersCount: t.baseLayers?.length || 0, // NOVO
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : "Data desconhecida",
  }));

  const mrrTotal = allTenants.reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const ativas = allTenants.filter(t => t.status === "ATIVO").length;
  const inadimplentes = allTenants.filter(t => t.status === "INADIMPLENTE").length;
  const trials = allTenants.filter(t => t.status === "TRIAL").length;

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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
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
                {["Município", "Status", "MRR", "Usuários", "Shapefiles", "Ações Técnicas"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TENANTS.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Nenhuma prefeitura encontrada.</td></tr>
              ) : (
                RECENT_TENANTS.map((tenant) => {
                  const s = STATUS_STYLES[tenant.status] || STATUS_STYLES.CANCELADO;
                  return (
                    <tr key={tenant.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">Plano {tenant.plan} • {tenant.createdAt}</p>
                      </td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.className}`}>{s.label}</span></td>
                      <td className="px-6 py-4 tabular-num font-medium text-foreground">{tenant.mrr === 0 ? "—" : formatBRLCompact(tenant.mrr)}</td>
                      <td className="px-6 py-4 tabular-num text-muted-foreground">{formatNumber(tenant.users)}</td>
                      <td className="px-6 py-4 tabular-num font-bold text-brand-600">{tenant.layersCount} Camadas</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold flex justify-end gap-3 items-center h-[72px]">
                        {/* NOVO BOTÃO: Adicionar Shapefile */}
                        <Link href={`?modal=upload&tenantId=${tenant.id}`} className="text-brand-600 hover:text-brand-800 transition-colors bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md flex items-center gap-1">
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

      {/* ── MODAL 1: CRIAR NOVA PREFEITURA ── */}
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

      {/* ── MODAL 2: UPLOAD DE SHAPEFILE (ENTERPRISE) ── */}
      {isUploadModalOpen && targetTenantId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-brand-500/30 bg-card p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-brand-100 text-brand-600 p-2 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Importar Base GIS</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Envie o arquivo ZIP contendo as extensões (.shp, .dbf, .shx) para compilar a cartografia desta prefeitura.</p>
            
            <form action={uploadShapefileAction} className="space-y-5">
              <input type="hidden" name="tenantId" value={targetTenantId} />
              
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Nome da Camada</label>
                <input name="name" type="text" required placeholder="Ex: Malha Viária Centro" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Tipo de Geografia</label>
                <select name="type" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500">
                  <option value="BOUNDARY">Limites do Município / Setores (Polígonos)</option>
                  <option value="STREETS">Ruas e Avenidas (Linhas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-600 mb-1.5">Arquivo Shapefile (.zip) *</label>
                <input name="file" type="file" accept=".zip" required className="w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 file:cursor-pointer cursor-pointer border border-dashed border-border p-2 rounded-lg" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</Link>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 shadow-md">
                  Processar Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
