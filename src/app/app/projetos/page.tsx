"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMapStore, selectUnsavedCount } from "@/store/useMapStore";
import { DrawingToolbar } from "@/components/map/drawing-toolbar";
import { LayerPanel }     from "@/components/map/layer-panel";
import { cn, formatBRLCompact, formatNumber } from "@/lib/utils";

const MapCanvas = dynamic(
  () => import("@/components/map/map-canvas").then((m) => m.MapCanvas),
  { ssr: false, loading: () => <div className="map-canvas animate-pulse bg-slate-900" /> },
);

// ─────────────────────────────────────────────
// Dados Iniciais (Mock que vai virar Banco de Dados)
// ─────────────────────────────────────────────
const INITIAL_PROJECTS = [
  { id: "1", name: "Recapeamento Av. Bezerra",     assets: 128, budget: 4_200_000, status: "EM_ANDAMENTO" },
  { id: "2", name: "Drenagem Montese — Fase 2",    assets: 0,   budget: 1_800_000, status: "PLANEJADO" },
  { id: "3", name: "Iluminação LED Centro",        assets: 341, budget: 920_000,   status: "CONCLUIDO" },
  { id: "4", name: "Pavimentação Rua das Flores",  assets: 57,  budget: 680_000,   status: "PARALISADO" },
  { id: "5", name: "Reforma Praça do Ferreira",    assets: 89,  budget: 3_100_000, status: "EM_ANDAMENTO" },
];

const STATUS_COLOR: Record<string, string> = {
  EM_ANDAMENTO: "bg-brand-100 text-brand-700 border-brand-200",
  PLANEJADO:    "bg-slate-100 text-slate-600 border-slate-200",
  CONCLUIDO:    "bg-accent-100 text-accent-700 border-accent-200",
  PARALISADO:   "bg-warning-100 text-warning-700 border-warning-200",
  CANCELADO:    "bg-danger-100 text-danger-700 border-danger-200",
};

const STATUS_LABEL: Record<string, string> = {
  EM_ANDAMENTO: "Andamento", PLANEJADO: "Planejado",
  CONCLUIDO:    "Concluído", PARALISADO: "Paralisado", CANCELADO: "Cancelado",
};

// ─────────────────────────────────────────────
// Componentes Menores
// ─────────────────────────────────────────────
function WorkstationTopbar({ selectedProject, onSave, unsaved }: {
  selectedProject: typeof INITIAL_PROJECTS[0] | null;
  onSave: () => void;
  unsaved: number;
}) {
  return (
    <div className="flex h-map-toolbar-h shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-display text-sm font-700 text-foreground">Workstation GIS</span>
        {selectedProject && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="max-w-[200px] truncate text-sm text-muted-foreground">{selectedProject.name}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {unsaved > 0 && (
          <span className="text-xs font-medium text-warning-600">
            {unsaved} feição{unsaved > 1 ? "ões" : ""} não salva{unsaved > 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={onSave}
          disabled={unsaved === 0}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            unsaved > 0 ? "bg-brand-600 text-white hover:bg-brand-500 shadow-sm" : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Salvar no PostGIS
        </button>
      </div>
    </div>
  );
}

function ProjectsPanel({ projects, selected, onSelect, onNewProject }: { 
  projects: typeof INITIAL_PROJECTS; 
  selected: string | null; 
  onSelect: (id: string) => void;
  onNewProject: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 font-display text-xs font-700 text-foreground">Projetos</p>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar projeto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 transition-all"
          />
        </div>
      </div>
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-2",
              selected === p.id ? "bg-brand-50 border-brand-600 dark:bg-brand-950/30" : "border-transparent"
            )}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className={cn("flex-1 truncate text-xs font-medium leading-snug", selected === p.id ? "text-brand-700 dark:text-brand-300 font-bold" : "text-foreground")}>
                {p.name}
              </p>
              <span className={`status-badge border shrink-0 text-[9px] ${STATUS_COLOR[p.status]}`}>
                {STATUS_LABEL[p.status]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{formatNumber(p.assets)} ativos</span>
              <span>·</span>
              <span>{formatBRLCompact(p.budget)}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <button 
          onClick={onNewProject}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Novo Projeto
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function ProjetosPage() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");

  const unsaved       = useMapStore(selectUnsavedCount);
  const features      = useMapStore((s) => s.features);
  const updateFeature = useMapStore((s) => s.updateFeature);
  
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  function handleSave() {
    features.filter((f) => !f.saved).forEach((f) => updateFeature(f.id, { saved: true }));
  }

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProject = {
      id: crypto.randomUUID(),
      name: newProjectName,
      assets: 0,
      budget: Number(newProjectBudget.replace(/\D/g, "")) || 0,
      status: "PLANEJADO"
    };

    setProjects([newProject, ...projects]);
    setSelectedProjectId(newProject.id); // Seleciona automaticamente o novo projeto
    setIsModalOpen(false); // Fecha o modal
    setNewProjectName(""); // Limpa os campos
    setNewProjectBudget("");
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden relative">
      <ProjectsPanel 
        projects={projects} 
        selected={selectedProjectId} 
        onSelect={setSelectedProjectId} 
        onNewProject={() => setIsModalOpen(true)}
      />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <WorkstationTopbar selectedProject={selectedProject} onSave={handleSave} unsaved={unsaved} />
        <div className="relative flex-1 overflow-hidden">
          <MapCanvas />
          <DrawingToolbar />
          <LayerPanel />
        </div>
      </div>

      {/* ── MODAL DE NOVO PROJETO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6">
            <div className="mb-5">
              <h3 className="font-display text-lg font-bold text-foreground">Novo Projeto GIS</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie um novo ambiente para desenhar infraestrutura.</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Expansão da Linha de Água..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Orçamento Previsto (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input
                    type="number"
                    value={newProjectBudget}
                    onChange={(e) => setNewProjectBudget(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}