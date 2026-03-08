"use client";

import { useState } from "react";
import { useMapStore, selectLayers } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Definição das camadas
// ─────────────────────────────────────────────
const LAYER_DEFS = [
  { key:"ativos"     as const, label:"Ativos (Pontos)",   color:"#3468f6", desc:"Bueiros, postes, hidrantes…" },
  { key:"obras"      as const, label:"Obras Ativas",      color:"#f59e0b", desc:"Intervenções em andamento"   },
  { key:"alertas"    as const, label:"Alertas",           color:"#ef4444", desc:"Problemas críticos"          },
  { key:"viario"     as const, label:"Rede Viária",       color:"#94a3b8", desc:"Ruas e avenidas"             },
  { key:"topografia" as const, label:"Curvas de Nível",   color:"#10b981", desc:"Topografia do terreno"       },
];

const MAP_STYLES = [
  { id:"streets"    as const, label:"Ruas (OSM)",  icon:"🗺" },
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
          "absolute right-4 top-16 z-toolbar rounded-xl border border-border bg-card/95 px-3 py-2",
          "text-xs font-medium text-foreground shadow-map backdrop-blur-sm hover:bg-muted transition-colors",
          className
        )}
      >
        ☰ Camadas
      </button>
    );
  }

  return (
    <div className={cn("layer-panel", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-display text-xs font-700 uppercase tracking-wider text-foreground">Camadas</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayerAll(!allOn)}
            className="text-[10px] font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            {allOn ? "Ocultar todas" : "Mostrar todas"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Estilo do mapa */}
      <div className="border-b border-border px-3 py-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Estilo base</p>
        <div className="flex gap-1">
          {MAP_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setMapStyle(s.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition-all",
                mapStyle === s.id
                  ? "bg-brand-600 text-white"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="text-base leading-none">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Camadas */}
      <div className="p-3 space-y-0.5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Visibilidade</p>
        {LAYER_DEFS.map(({ key, label, color, desc }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors text-left",
              layers[key]
                ? "bg-muted/50 text-foreground"
                : "text-muted-foreground hover:bg-muted/30"
            )}
          >
            {/* Indicador de cor */}
            <div className="relative shrink-0">
              <span
                className={cn("block h-3 w-3 rounded-full transition-opacity", !layers[key] && "opacity-25")}
                style={{ backgroundColor: color }}
              />
              {layers[key] && (
                <span className="absolute -inset-1 rounded-full animate-ping opacity-20" style={{ backgroundColor: color }} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn("font-medium leading-none truncate", layers[key] ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60 truncate">{desc}</p>
            </div>

            {/* Toggle pill */}
            <div className={cn(
              "shrink-0 flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors",
              layers[key] ? "bg-brand-100 text-brand-700" : "bg-muted text-muted-foreground"
            )}>
              {layers[key] ? "On" : "Off"}
            </div>
          </button>
        ))}
      </div>

      {/* Features desenhadas */}
      {features.length > 0 && (
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Desenhados ({features.length})
            </p>
            <button
              onClick={() => useMapStore.getState().clearFeatures()}
              className="text-[10px] text-danger-600 hover:text-danger-500 transition-colors"
            >
              Limpar
            </button>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {features.map((f) => {
              // Correção na lógica dos ícones
              const isGeometry = f.type === "line" || f.type === "polygon";
              const icon = f.type === "line" ? "➖" : f.type === "polygon" ? "⬡" : "📍";
              return (
                <div key={f.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{icon}</span>
                  <span className="truncate">{f.label || `${f.type.replace("_", " ")} #${f.id.slice(-4)}`}</span>
                  <button
                    onClick={() => useMapStore.getState().removeFeature(f.id)}
                    className="ml-auto shrink-0 text-danger-500 hover:text-danger-600 transition-colors"
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
      <div className="border-t border-border p-3">
        <button
          onClick={onExportGeoJSON}
          className="w-full rounded-lg border border-border py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-2"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Exportar GeoJSON
        </button>
      </div>
    </div>
  );
}