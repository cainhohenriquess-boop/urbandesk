"use client";

import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatBRLCompact, formatPercent, formatNumber, getStatusConfig } from "@/lib/utils";

// ─────────────────────────────────────────────
// Mock data (substituir por fetch/Server Actions)
// ─────────────────────────────────────────────
const EVOLUCAO_MENSAL = [
  { mes: "Jan", concluidas: 4,  andamento: 8,  orcamento: 1_200_000 },
  { mes: "Fev", concluidas: 6,  andamento: 9,  orcamento: 1_450_000 },
  { mes: "Mar", concluidas: 5,  andamento: 11, orcamento: 1_800_000 },
  { mes: "Abr", concluidas: 9,  andamento: 10, orcamento: 2_100_000 },
  { mes: "Mai", concluidas: 7,  andamento: 14, orcamento: 2_400_000 },
  { mes: "Jun", concluidas: 12, andamento: 12, orcamento: 2_700_000 },
  { mes: "Jul", concluidas: 10, andamento: 15, orcamento: 3_100_000 },
];

const DISTRIBUICAO_STATUS = [
  { status: "Concluídas",   value: 48, color: "#10b981" },
  { status: "Em Andamento", value: 29, color: "#3468f6" },
  { status: "Paralisadas",  value: 8,  color: "#f59e0b" },
  { status: "Planejadas",   value: 15, color: "#94a3b8" },
];

const PROJETOS_RECENTES = [
  { id:"1", name:"Recapeamento Av. Bezerra de Menezes",  status:"EM_ANDAMENTO" as const, budget:4_200_000, pct:67,  assets:142, dueDate:"2025-09-30" },
  { id:"2", name:"Rede de Drenagem — Bairro Montese",    status:"PARALISADO"   as const, budget:1_800_000, pct:34,  assets:58,  dueDate:"2025-07-15" },
  { id:"3", name:"Iluminação LED — Centro Histórico",    status:"CONCLUIDO"    as const, budget:980_000,   pct:100, assets:312, dueDate:"2025-03-01" },
  { id:"4", name:"Pavimentação Rua das Flores",          status:"PLANEJADO"    as const, budget:620_000,   pct:0,   assets:0,   dueDate:"2025-12-01" },
  { id:"5", name:"Praça da República — Revitalização",   status:"EM_ANDAMENTO" as const, budget:2_100_000, pct:52,  assets:87,  dueDate:"2025-10-31" },
];

const KPI_CARDS = [
  { label:"Orçamento Total",    value:formatBRLCompact(28_400_000), sub:"Exercício 2025",     change:"+18% vs 2024",        up:true,  icon:"💰", accent:"text-brand-600"   },
  { label:"Obras em Andamento", value:"29",                         sub:"de 100 projetos",    change:"+4 este mês",          up:true,  icon:"🏗️", accent:"text-accent-600"  },
  { label:"Ativos Mapeados",    value:formatNumber(8_901),          sub:"via GPS + GIS",      change:"+312 esta semana",     up:true,  icon:"📍", accent:"text-violet-600"  },
  { label:"Taxa de Conclusão",  value:formatPercent(0.48),          sub:"48 obras concluídas",change:"Meta: 60% até Dez",    up:false, icon:"📊", accent:"text-warning-600" },
];

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-map text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-num">
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

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
// Page
// ─────────────────────────────────────────────
export default function SecretariaPage() {
  const [periodo, setPeriodo] = useState<"7d"|"30d"|"90d">("30d");

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-800 text-foreground">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada das obras e infraestrutura do município.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["7d","30d","90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                periodo === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
            </button>
          ))}
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
        <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-700 text-foreground">Evolução de Obras</h2>
              <p className="text-xs text-muted-foreground">Concluídas vs Em Andamento</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-500" />Concluídas</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" />Em Andamento</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={EVOLUCAO_MENSAL} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3468f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3468f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize:11, fill:"hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="concluidas" name="Concluídas"   stroke="#10b981" fill="url(#gC)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="andamento"  name="Em Andamento" stroke="#3468f6" fill="url(#gA)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição + mini orçamento */}
        <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-display text-sm font-700 text-foreground">Distribuição por Status</h2>
          <div className="space-y-4">
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
                    style={{ width:`${item.value}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Orçamento / Mês</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={EVOLUCAO_MENSAL} margin={{ top:0, right:0, bottom:0, left:0 }}>
                <Bar dataKey="orcamento" radius={[3,3,0,0]}>
                  {EVOLUCAO_MENSAL.map((_, i) => (
                    <Cell key={i} fill={i === EVOLUCAO_MENSAL.length - 1 ? "#3468f6" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-right text-xs tabular-num text-muted-foreground">
              {formatBRLCompact(3_100_000)} em Jul
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Projetos */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-700 text-foreground">Projetos Recentes</h2>
          <a href="/app/projetos" className="text-xs font-medium text-brand-600 hover:text-brand-500 transition-colors">
            Abrir Workstation GIS →
          </a>
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
              {PROJETOS_RECENTES.map((proj) => {
                const s = getStatusConfig(proj.status);
                return (
                  <tr key={proj.id} className="transition-colors hover:bg-muted/20">
                    <td className="max-w-[240px] px-5 py-3.5">
                      <p className="truncate font-medium text-foreground">{proj.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`status-badge ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3.5 tabular-num text-foreground">{formatBRLCompact(proj.budget)}</td>
                    <td className="px-5 py-3.5 w-40"><ProgressBar pct={proj.pct} status={proj.status} /></td>
                    <td className="px-5 py-3.5 tabular-num text-muted-foreground">{formatNumber(proj.assets)}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(proj.dueDate).toLocaleDateString("pt-BR")}
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
