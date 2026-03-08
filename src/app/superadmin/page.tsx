import { prisma } from "@/lib/prisma";
import { formatBRLCompact, formatNumber } from "@/lib/utils";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

type TenantStatus = "ATIVO" | "TRIAL" | "INADIMPLENTE" | "CANCELADO";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ATIVO: { label: "Ativo", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  TRIAL: { label: "Trial", className: "bg-brand-100 text-brand-800 border-brand-200" },
  INADIMPLENTE: { label: "Inadimplente", className: "bg-danger-100 text-danger-800 border-danger-200" },
  CANCELADO: { label: "Cancelado", className: "bg-slate-100 text-slate-600 border-slate-200" },
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
          <svg className={`h-6 w-6 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </div>
  );
}

export default async function SuperAdminPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined }; }) {
  const safeParams = searchParams || {};
  const q = typeof safeParams.q === "string" ? safeParams.q : "";
  const filterStatus = typeof safeParams.status === "string" ? safeParams.status : "";
  const isModalOpen = safeParams.modal === "new";
  const isUploadModalOpen = safeParams.modal === "upload";
  const targetTenantId = typeof safeParams.tenantId === "string" ? safeParams.tenantId : null;

  // ─────────────────────────────────────────────
  // SERVER ACTION 1: Criar Prefeitura + Robô OSM + Gerar Equipe
  // ─────────────────────────────────────────────
  async function createTenantAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const state = formData.get("state") as string;
    const plan = formData.get("plan") as string;
    const rawPassword = formData.get("password") as string;

    if (!name || !state || !rawPassword) return;

    const mrr = plan === "PRO" ? 2400 : plan === "ENTERPRISE" ? 4800 : 890;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const cnpj = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();

    // 1. Cria a Prefeitura no Banco
    const tenant = await prisma.tenant.create({
      data: { name, slug, cnpj, state, plan: plan as any, status: "TRIAL", mrr, trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
    });

    // 2. Busca o Limite Municipal na API do OpenStreetMap (Nominatim)
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
      console.error("Erro ao puxar limite do OSM:", e); // Falha silenciosa amigável, não trava a criação
    }

    // 3. Cria os Usuários de Acesso da Prefeitura (Senhas Criptografadas)
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
    } catch (error) { console.error("ERRO GRAVE SHAPEFILE:", error); }
    
    revalidatePath("/superadmin");
    redirect("/superadmin");
  }

  // ─────────────────────────────────────────────
  // Carregamento de Dados da Tela
  // ─────────────────────────────────────────────
  let dbTenants: any[] = [];
  let allTenants: any[] = [];
  
  try {
    const whereClause: any = { name: { contains: q, mode: "insensitive" } };
    if (filterStatus) whereClause.status = filterStatus;
    dbTenants = await prisma.tenant.findMany({ where: whereClause, include: { _count: { select: { users: true, assets: true } }, baseLayers: { select: { id: true } } }, orderBy: { createdAt: "desc" }});
    allTenants = await prisma.tenant.findMany({ select: { mrr: true, status: true, plan: true } });
  } catch (error: any) { return <div className="p-8 text-red-600 font-bold">Erro Banco: {error.message}</div>; }

  const RECENT_TENANTS = dbTenants.map((t) => ({
    id: t.id, name: t.name || "Sem Nome", state: t.state || "BR", plan: t.plan || "STARTER", slug: t.slug,
    status: (t.status || "CANCELADO") as TenantStatus, mrr: Number(t.mrr) || 0, users: t._count?.users || 0,
    layersCount: t.baseLayers?.length || 0, createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : "-",
  }));

  const mrrTotal = allTenants.reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  const ativas = allTenants.filter(t => t.status === "ATIVO").length;
  
  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="font-display text-2xl font-bold text-foreground">Dashboard Executivo</h1></div>
        <div className="flex items-center gap-3">
          <Link href="?modal=new" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 shadow-sm">Nova Prefeitura</Link>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="MRR Total" value={formatBRLCompact(mrrTotal)} up={true} color="text-emerald-600" bg="bg-emerald-50" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        <KpiCard label="Prefeituras Ativas" value={ativas.toString()} up={true} color="text-brand-600" bg="bg-brand-50" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Município", "Status", "Logins", "Shapefiles", "Ações Técnicas"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TENANTS.map((tenant) => {
                const s = STATUS_STYLES[tenant.status] || STATUS_STYLES.CANCELADO;
                return (
                  <tr key={tenant.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{tenant.name} - {tenant.state}</p>
                      <p className="text-xs text-muted-foreground">Plano {tenant.plan}</p>
                    </td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.className}`}>{s.label}</span></td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      engenheiro@{tenant.slug}<br/>secretario@{tenant.slug}
                    </td>
                    <td className="px-6 py-4 tabular-num font-bold text-brand-600">{tenant.layersCount} Camadas</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold flex justify-end gap-3 items-center h-[72px]">
                      <Link href={`?modal=upload&tenantId=${tenant.id}`} className="text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md flex items-center gap-1">Subir Mapa</Link>
                      <Link href={`/api/auth/impersonate?tenantId=${tenant.id}`} className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md">Acessar →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl relative">
            <h3 className="font-display text-xl font-bold text-foreground mb-1">Cadastrar Nova Prefeitura</h3>
            <p className="text-xs text-muted-foreground mb-4">A plataforma buscará o limite municipal no OpenStreetMap e gerará os acessos.</p>
            <form action={createTenantAction} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Cidade *</label>
                  <input name="name" type="text" required placeholder="Ex: Fortaleza" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Estado (UF) *</label>
                  <input name="state" type="text" required maxLength={2} placeholder="Ex: CE" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 uppercase" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Senha Padrão da Equipe *</label>
                <input name="password" type="text" required placeholder="Senha que os usuários usarão" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Plano Assinado *</label>
                <select name="plan" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"><option value="STARTER">Starter</option><option value="PRO">Pro</option><option value="ENTERPRISE">Enterprise</option></select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-border mt-4">
                <Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</Link>
                <button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Gerar Tudo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && targetTenantId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-500/30 bg-card p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-foreground mb-4">Importar Base GIS</h3>
            <form action={uploadShapefileAction} className="space-y-4">
              <input type="hidden" name="tenantId" value={targetTenantId} />
              <div><label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Nome da Camada</label><input name="name" type="text" required placeholder="Ex: Malha Viária" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Tipo de Geografia</label>
                <select name="type" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="BOUNDARY">Limites do Município / Setores (Polígonos)</option>
                  <option value="STREETS">Formato das Ruas / Buffers (Polígonos)</option>
                  <option value="STREET_NAMES">Nomes das Ruas (Linhas com coluna 'name')</option>
                </select>
              </div>
              <div><label className="block text-xs font-bold uppercase text-brand-600 mb-1">Arquivo Shapefile (.zip) *</label><input name="file" type="file" accept=".zip" required className="w-full text-sm border border-dashed border-border p-2 rounded-lg" /></div>
              <div className="flex gap-3 pt-4"><Link href="/superadmin" className="flex-1 rounded-lg py-2.5 text-center text-sm font-medium text-muted-foreground bg-muted">Cancelar</Link><button type="submit" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white">Processar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}