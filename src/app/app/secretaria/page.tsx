import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatBRLCompact, formatPercent, formatNumber, getStatusConfig } from "@/lib/utils";
import { UrbanAreaChart, UrbanBarChart } from "@/components/dashboard/charts";

// ─────────────────────────────────────────────
// Sub-componentes UI
// ─────────────────────────────────────────────
function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const colorMap: Record<string, string> = {
    CONCLUIDO: "bg-accent-500", EM_ANDAMENTO: "bg-brand-500",
    PARALISADO: "bg-warning-500", PLANEJADO: "bg-slate-300",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorMap[status] ?? "bg-slate-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] tabular-num text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page (Server Component — Lê direto do Banco)
// ─────────────────────────────────────────────
export default async function SecretariaPage({
  searchParams,
}: {
  searchParams: { p?: string };
}) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  const periodo = searchParams.p || "30d";

  if (!tenantId) {
    return <div className="p-6 text-center text-muted-foreground">Erro: Ambiente da prefeitura não encontrado.</div>;
  }

  // 1. Buscas Reais no PostgreSQL via Prisma
  const projects = await prisma.project.findMany({
    where: { tenantId },
    include: { _count: { select: { assets: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const assetsCount = await prisma.asset.count({ where: { tenantId } });

  // 2. Cálculos Dinâmicos
  const totalBudget = projects.reduce((acc, proj) => acc + Number(proj.budget || 0), 0);
  const emAndamento = projects.filter(p => p.status === "EM_ANDAMENTO").length;
  const concluidas = projects.filter(p => p.status === "CONCLUIDO").length;
  const paralisadas = projects.filter(p => p.status === "PARALISADO").length;
  const planejadas = projects.filter(p => p.status === "PLANEJADO").length;
  const totalProjetos = projects.length || 1; // Evita divisão por zero

  const taxaConclusao = concluidas / totalProjetos;

  // 3. Montagem dos Cards Superiores
  const KPI_CARDS = [
    { label:"Orçamento Total",    value:formatBRLCompact(totalBudget), sub:"Soma de projetos",   change:"Lido do Banco de Dados", up:true,  icon:"💰", accent:"text-brand-600"   },
    { label:"Obras em Andamento", value:emAndamento.toString(),        sub:`de ${projects.length} obras`, change:"Atualizado ao vivo",    up:true,  icon:"🏗️", accent:"text-accent-600"  },
    { label:"Ativos Mapeados",    value:formatNumber(assetsCount),     sub:"via App e GIS",      change:"Atualizado ao vivo",    up:true,  icon:"📍", accent:"text-violet-600"  },
    { label:"Taxa de Conclusão",  value:formatPercent(taxaConclusao),  sub:`${concluidas} obras finalizadas`, change:"Meta global: 60%", up:taxaConclusao >= 0.5, icon:"📊", accent:"text-warning-600" },
  ];

  // 4. Distribuição para as barras de status
  const DISTRIBUICAO_STATUS = [
    { status: "Concluídas",   value: concluidas,  color: "#10b981", pct: (concluidas/totalProjetos)*100 },
    { status: "Em Andamento", value: emAndamento, color: "#3468f6", pct: (emAndamento/totalProjetos)*100 },
    { status: "Paralisadas",  value: paralisadas, color: "#f59e0b", pct: (paralisadas/totalProjetos)*100 },
    { status: "Planejadas",   value: planejadas,  color: "#94a3b8", pct: (planejadas/totalProjetos)*100 },
  ];

  // 5. Tabela de Projetos Recentes (Top 5)
  const PROJETOS_RECENTES = projects.slice(0, 5).map(proj => ({
    id: proj.id,
    name: proj.name,
    status: proj.status,
    budget: Number(proj.budget || 0),
    pct: proj.completionPct || 0,
    assets: proj._count.assets,
    dueDate: proj.endDate ? new Date(proj.endDate).toLocaleDateString("pt-BR") : "Não definido",
  }));

  // 6. Evolução Mensal (Híbrida: Histórico Mock + Mês Atual Dinâmico do Banco)
  const EVOLUCAO_MENSAL = [
    { mes: "Fev", concluidas: 6,  andamento: 9,  orcamento: 1_450_000 },
    { mes: "Mar", concluidas: 5,  andamento: 11, orcamento: 1_800_000 },
    { mes: "Abr", concluidas: 9,  andamento: 10, orcamento: 2_100_000 },
    { mes: "Mai", concluidas: 7,  andamento: 14, orcamento: 2_400_000 },
    { mes: "Jun", concluidas: 12, andamento: 12, orcamento: 2_700_000 },
    { mes: "Atual", concluidas: concluidas, andamento: emAndamento, orcamento: totalBudget }, // Puxa os dados calculados do banco!
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-800 text-foreground">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada das obras e infraestrutura lidas em tempo real.
          </p>
        </div>
        
        {/* Filtros com Server-Side Rendering via searchParams */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["7d","30d","90d"] as const).map((p) => {
            const isActive = periodo === p;
            return (
              <Link
                key={p}
                href={`?p=${p}`}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
              </Link>
            );
          })}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="dashboard-grid">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="kpi-card group cursor-default">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="font-display text-2xl font-800 text-foreground tabular-num">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.sub}</p>
              </div>
              <span className="text-2xl leading-none">{kpi.icon}</span>
            </div>
            <p className={`mt-3 text-xs font-medium ${kpi.up ? "text-accent-600" : "text-warning-600"}`}>
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Evolução mensal */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-foreground">Evolução de Obras</h2>
              <p className="text-xs text-muted-foreground">Concluídas vs Em Andamento</p>
            </div>
          </div>
          <UrbanAreaChart
            data={EVOLUCAO_MENSAL}
            xKey="mes"
            series={[
              { dataKey: "concluidas", name: "Concluídas", color: "#10b981" },
              { dataKey: "andamento", name: "Em Andamento", color: "#3468f6" }
            ]}
            height={220}
          />
        </div>

        {/* Distribuição + mini orçamento */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2 flex flex-col">
          <h2 className="mb-4 font-display text-sm font-700 text-foreground">Distribuição por Status</h2>
          <div className="space-y-4 flex-1">
            {DISTRIBUICAO_STATUS.map((item) => (
              <div key={item.status} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-foreground">{item.status}</span>
                  </div>
                  <span className="tabular-num font-medium text-foreground">{item.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${item.pct}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Orçamento Atual</p>
            <UrbanBarChart
              data={EVOLUCAO_MENSAL.slice(-4)} // Mostrar os 4 últimos meses para focar no "Atual"
              xKey="mes"
              series={[{ dataKey: "orcamento", name: "Orçamento (R$)", color: "#3468f6" }]}
              height={80}
            />
            <p className="mt-1 text-right text-xs tabular-num text-muted-foreground">
              {formatBRLCompact(totalBudget)} Consolidado
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Projetos */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-700 text-foreground">Projetos Lidos da Base de Dados</h2>
          <Link href="/app/projetos" className="text-xs font-medium text-brand-600 hover:text-brand-500 transition-colors">
            Ir para Projetos GIS →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Projeto","Status","Orçamento","Progresso","Ativos GIS","Prazo"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PROJETOS_RECENTES.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum projeto encontrado. <Link href="/app/projetos" className="text-brand-600 hover:underline">Crie o primeiro na aba Projetos GIS.</Link>
                  </td>
                </tr>
              ) : (
                PROJETOS_RECENTES.map((proj) => {
                  const s = getStatusConfig(proj.status);
                  return (
                    <tr key={proj.id} className="transition-colors hover:bg-muted/20">
                      <td className="max-w-[240px] px-5 py-3.5">
                        <p className="truncate font-medium text-foreground">{proj.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`status-badge border ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3.5 tabular-num text-foreground">{formatBRLCompact(proj.budget)}</td>
                      <td className="px-5 py-3.5 w-40"><ProgressBar pct={proj.pct} status={proj.status} /></td>
                      <td className="px-5 py-3.5 tabular-num text-muted-foreground">{formatNumber(proj.assets)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {proj.dueDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}