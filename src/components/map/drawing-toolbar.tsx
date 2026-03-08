"use client";

import { useMapStore, DrawMode } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

const TOOL_GROUPS: { title: string; items: { id: DrawMode; label: string; icon: React.ReactNode; color: string }[] }[] = [
  {
    title: "Ações",
    items: [
      { id: "SELECT", label: "Selecionar", color: "bg-slate-500", icon: <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" strokeWidth="2" strokeLinejoin="round"/> },
    ]
  },
  {
    title: "Geometria",
    items: [
      { id: "line", label: "Rede / Trecho (Linha)", color: "bg-indigo-500", icon: <path d="M4 20L20 4m-4 16L4 4" strokeWidth="2" strokeLinecap="round"/> },
      { id: "polygon", label: "Lote / Área (Polígono)", color: "bg-indigo-400", icon: <path d="M12 2L2 22h20L12 2z" strokeWidth="2" strokeLinejoin="round"/> },
    ]
  },
  {
    title: "Saneamento",
    items: [
      { id: "BOCA_LOBO", label: "Boca de Lobo", color: "bg-blue-500", icon: <path d="M4 4h16v16H4zM4 12h16M12 4v16" strokeWidth="2" strokeLinecap="round"/> },
      { id: "POCO_VISITA", label: "Poço de Visita (PV)", color: "bg-slate-600", icon: <><circle cx="12" cy="12" r="10" strokeWidth="2"/><circle cx="12" cy="12" r="6" strokeWidth="2" strokeDasharray="2 2"/></> },
      { id: "HIDRANTE", label: "Hidrante", color: "bg-red-500", icon: <path d="M12 2v4M8 6h8v14H8zM4 10h4M16 10h4M12 14v2" strokeWidth="2" strokeLinecap="round"/> },
    ]
  },
  {
    title: "Mobilidade",
    items: [
      { id: "SEMAFORO", label: "Semáforo", color: "bg-amber-500", icon: <><rect x="8" y="2" width="8" height="20" rx="2" strokeWidth="2"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></> },
      { id: "PLACA_TRANSITO", label: "Sinalização", color: "bg-red-600", icon: <path d="M12 2L2 12l10 10 10-10zM12 8v8" strokeWidth="2" strokeLinejoin="round"/> },
      { id: "LOMBADA", label: "Lombada", color: "bg-orange-500", icon: <path d="M3 16c4-6 8-6 12 0" strokeWidth="2" strokeLinecap="round"/> },
    ]
  },
  {
    title: "Zeladoria",
    items: [
      { id: "POSTE_LUZ", label: "Poste de Iluminação", color: "bg-yellow-400", icon: <path d="M12 2a3 3 0 00-3 3v1h6V5a3 3 0 00-3-3zM11 6v16h2V6z" strokeWidth="2" fill="currentColor"/> },
      { id: "ARVORE", label: "Árvore/Vegetação", color: "bg-emerald-500", icon: <path d="M12 2C8 2 5 6 7 10c-3 2-2 6 0 7h10c2-1 3-5 0-7 2-4-1-8-5-8zM11 17v5h2v-5" strokeWidth="2" strokeLinejoin="round"/> },
      { id: "BURACO", label: "Buraco na Via", color: "bg-amber-600", icon: <path d="M12 2L2 20h20L12 2zM12 8v4M12 16h.01" strokeWidth="2" strokeLinecap="round"/> },
    ]
  }
];

export function DrawingToolbar() {
  const mode = useMapStore((s) => s.drawMode);
  // CORREÇÃO: A função no store se chama setDrawMode, não setMode.
  const setDrawMode = useMapStore((s) => s.setDrawMode);

  return (
    <div className="absolute left-4 top-4 bottom-4 z-10 flex flex-col rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md animate-fade-in w-14 overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 no-scrollbar scroll-smooth">
        {TOOL_GROUPS.map((group, gIdx) => (
          <div key={group.title} className={cn("flex flex-col gap-2", gIdx !== 0 && "mt-4 pt-3 border-t border-border/50")}>
            <div className="text-center text-[8px] font-bold uppercase tracking-widest text-muted-foreground truncate px-1" title={group.title}>
              {group.title.substring(0, 4)}
            </div>
            
            {group.items.map((tool) => {
              const isActive = mode === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setDrawMode(tool.id)}
                  className={cn(
                    "group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    isActive ? "bg-brand-100 text-brand-700 shadow-inner dark:bg-brand-900/50 dark:text-brand-300" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    {tool.icon}
                  </svg>
                  <span className="absolute left-14 scale-0 rounded bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap shadow-lg z-50">
                    {tool.label}
                    <span className="absolute top-1/2 -left-1 -translate-y-1/2 border-[4px] border-transparent border-r-foreground" />
                  </span>
                  {isActive && <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card ${tool.color}`} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}