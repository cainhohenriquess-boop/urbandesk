"use client";

import { cn } from "@/lib/utils";
import type { WorkspaceTool } from "@/store/useMapStore";

type ToolbarTool = {
  id: WorkspaceTool;
  label: string;
  helper: string;
};

const TOOLS: ToolbarTool[] = [
  { id: "SELECT", label: "Selecionar", helper: "Inspecionar" },
  { id: "EDIT_GEOMETRY", label: "Editar", helper: "Vértices" },
  { id: "MOVE", label: "Mover", helper: "Transladar" },
  { id: "MEASURE_DISTANCE", label: "Distância", helper: "Medir" },
  { id: "MEASURE_AREA", label: "Área", helper: "Medir" },
  { id: "SPLIT_TRECHO", label: "Dividir trecho", helper: "Quebrar linha" },
  { id: "JOIN_TRECHOS", label: "Unir trechos", helper: "Mesclar" },
  { id: "SPATIAL_SEARCH", label: "Busca espacial", helper: "Raio" },
];

type ProjectMapGlobalToolbarProps = {
  activeTool: WorkspaceTool;
  onToolChange: (tool: WorkspaceTool) => void;
  snapEnabled: boolean;
  onSnapChange: (enabled: boolean) => void;
  measurementLabel: string | null;
  onClearMeasurement: () => void;
  spatialSearchRadius: number;
  onSpatialSearchRadiusChange: (radius: number) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onJoinSelected: () => void;
  canJoinSelected: boolean;
};

export function ProjectMapGlobalToolbar({
  activeTool,
  onToolChange,
  snapEnabled,
  onSnapChange,
  measurementLabel,
  onClearMeasurement,
  spatialSearchRadius,
  onSpatialSearchRadiusChange,
  onImportClick,
  onExportClick,
  onJoinSelected,
  canJoinSelected,
}: ProjectMapGlobalToolbarProps) {
  return (
    <div className="border-b border-border bg-slate-950 px-5 py-3 text-slate-50">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                activeTool === tool.id
                  ? "border-brand-400 bg-brand-500 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              )}
            >
              <span className="block text-sm font-semibold">{tool.label}</span>
              <span className="block text-[11px] text-slate-300">{tool.helper}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(event) => onSnapChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-brand-500"
            />
            Snap básico
          </label>

          {activeTool === "SPATIAL_SEARCH" ? (
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
              Raio
              <input
                type="range"
                min={10}
                max={250}
                step={5}
                value={spatialSearchRadius}
                onChange={(event) => onSpatialSearchRadiusChange(Number(event.target.value))}
              />
              <span className="min-w-12 text-right text-xs text-slate-300">{spatialSearchRadius}m</span>
            </label>
          ) : null}

          {measurementLabel ? (
            <div className="flex items-center gap-2 rounded-xl border border-brand-400 bg-brand-500/10 px-3 py-2 text-sm text-slate-50">
              <span>{measurementLabel}</span>
              <button onClick={onClearMeasurement} className="text-xs font-semibold text-brand-200 hover:text-white">
                Limpar
              </button>
            </div>
          ) : null}

          {activeTool === "JOIN_TRECHOS" ? (
            <button
              onClick={onJoinSelected}
              disabled={!canJoinSelected}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                canJoinSelected
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "cursor-not-allowed bg-slate-700 text-slate-400"
              )}
            >
              Unir selecionados
            </button>
          ) : null}

          <button onClick={onImportClick} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Importar GeoJSON
          </button>
          <button onClick={onExportClick} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
