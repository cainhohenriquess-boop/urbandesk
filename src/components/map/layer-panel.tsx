"use client";

import { useState } from "react";
import { useMapStore, selectLayers } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Definição das Camadas (Agora com a Base GIS Oficial)
// ─────────────────────────────────────────────
const LAYER_DEFS = [
  { key:"basegis"    as const, label:"Base Cartográfica", color:"#0ea5e9", desc:"Limites e Ruas (Shapefiles)" },
  { key:"ativos"     as const, label:"Ativos (Pontos)",   color:"#3468f6", desc:"Bueiros, postes, hidrantes…" },
  { key:"obras"      as const, label:"Obras Ativas",      color:"#f59e0b", desc:"Intervenções em andamento"   },
  { key:"alertas"    as const, label:"Alertas",           color:"#ef4444", desc:"Problemas críticos"          },
  { key:"viario"     as const, label:"Rede Viária",       color:"#94a3b8", desc:"Traçados e vias desenhadas"  },
  { key:"topografia" as const, label:"Curvas de Nível",   color:"#10b981", desc:"Topografia do terreno"       },
];

// ─────────────────────────────────────────────
// Estilos de Mapa (Removido o OSM Comercial)
// ─────────────────────────────────────────────
const MAP_STYLES = [
  { id:"gis"        as const, label:"Base GIS",    icon:"🗺" },
  { id:"satellite"  as const, label:"Satélite",    icon:"🛰" },
  { id:"topography" as const, label:"Topografia",  icon:"⛰" },
];

// ─────────────────────────────────────────────
// LayerPanel
// ─────────────────────────────────────────────
interface LayerPanelProps {
  onExportGeoJSON?: () => void;
  className?:       string;
}

export function LayerPanel({ onExportGeoJSON, className }: LayerPanelProps) {
  const [open, setOpen] = useState(true);

  const layers     = useMapStore(selectLayers);
  const toggleLayer= useMapStore((s) => s.toggleLayer);
  const setLayerAll= useMapStore((s) => s.setLayerAll);
  const mapStyle   = useMapStore((s) => s.mapStyle);
  const setMapStyle= useMapStore((s) => s.setMapStyle);
  const features   = useMapStore((s) => s.features);

  const allOn  = Object.values(layers).every(Boolean);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "absolute right-4 top-16 z-[45] rounded-xl border border-border bg-card/95 px-3 py-2",
          "text-xs font-medium text-foreground shadow-xl backdrop-blur-sm hover:bg-muted transition-colors",
          className
        )}
      >
        ☰ Camadas
      </button>
    );
  }

  return (
    <div className={cn("absolute right-4 top-16 z-[45] w-64 rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md flex flex-col max-h-[calc(100vh-120px)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Camadas GIS</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayerAll(!allOn)}
            className="text-[10px] font-bold text-brand-600 hover:text-brand-500 transition-colors"
          >
            {allOn ? "Ocultar todas" : "Mostrar todas"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-danger-500 transition-colors ml-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Estilo do mapa */}
      <div className="border-b border-border px-3 py-3 shrink-0 bg-muted/20">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estilo do Terreno</p>
        <div className="flex gap-1">
          {MAP_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setMapStyle(s.id as any)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold transition-all shadow-sm",
                mapStyle === s.id
                  ? "bg-brand-600 text-white ring-2 ring-brand-500/30"
                  : "bg-background border border-border text-muted-foreground hover:border-brand-500/50 hover:text-foreground"
              )}
            >
              <span className="text-base leading-none mb-0.5">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Camadas */}
      <div className="p-3 space-y-1 overflow-y-auto no-scrollbar">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visibilidade de Dados</p>
        {LAYER_DEFS.map(({ key, label, color, desc }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-all text-left border",
              layers[key]
                ? "bg-background border-border shadow-sm text-foreground"
                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
            )}
          >
            {/* Indicador de cor */}
            <div className="relative shrink-0 flex items-center justify-center">
              <span
                className={cn("block h-3 w-3 rounded-full transition-opacity shadow-sm", !layers[key] && "opacity-30 grayscale")}
                style={{ backgroundColor: color }}
              />
              {layers[key] && key === "basegis" && (
                <span className="absolute -inset-1.5 rounded-full animate-ping opacity-30" style={{ backgroundColor: color }} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn("font-bold leading-none truncate", layers[key] ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </p>
              <p className="mt-1 text-[9px] text-muted-foreground/70 truncate font-medium">{desc}</p>
            </div>

            {/* Toggle Switch Visual */}
            <div className={cn(
              "shrink-0 flex h-4 w-7 items-center rounded-full px-0.5 transition-colors",
              layers[key] ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-700"
            )}>
              <div className={cn(
                "h-3 w-3 rounded-full bg-white transition-transform shadow-sm",
                layers[key] ? "translate-x-3" : "translate-x-0"
              )} />
            </div>
          </button>
        ))}
      </div>

      {/* Features desenhadas (Memória Local) */}
      {features.length > 0 && (
        <div className="border-t border-border px-3 py-3 shrink-0 bg-muted/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Desenhados Agora ({features.length})
            </p>
            <button
              onClick={() => useMapStore.getState().clearFeatures()}
              className="text-[10px] font-bold text-danger-600 hover:text-danger-500 transition-colors"
            >
              Limpar Tudo
            </button>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1.5 no-scrollbar">
            {features.map((f) => {
              const icon = f.type === "line" ? "➖" : f.type === "polygon" ? "⬡" : "📍";
              return (
                <div key={f.id} className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground bg-background border border-border rounded-md px-2 py-1.5">
                  <span className="shrink-0">{icon}</span>
                  <span className="truncate flex-1">{f.label || `${f.type.replace("_", " ")} #${f.id.slice(-4)}`}</span>
                  <button
                    onClick={() => useMapStore.getState().removeFeature(f.id)}
                    className="shrink-0 text-danger-400 hover:text-danger-600 transition-colors px-1"
                    title="Remover do mapa"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Exportar */}
      <div className="border-t border-border p-3 shrink-0">
        <button
          onClick={onExportGeoJSON}
          className="w-full rounded-lg border border-border bg-background py-2 text-xs font-bold text-muted-foreground hover:border-brand-500 hover:text-brand-600 shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Exportar GeoJSON Local
        </button>
      </div>
    </div>
  );
}