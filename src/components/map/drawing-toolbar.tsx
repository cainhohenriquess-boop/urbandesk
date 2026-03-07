"use client";

import { useMapStore, selectDrawMode, type DrawMode } from "@/store/useMapStore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/select";

// ─────────────────────────────────────────────
// Definição das ferramentas
// ─────────────────────────────────────────────
const TOOLS: {
  mode:    DrawMode;
  icon:    string;
  label:   string;
  shortcut:string;
}[] = [
  { mode:"none",    icon:"🖱",  label:"Selecionar",  shortcut:"Esc" },
  { mode:"point",   icon:"📍",  label:"Ponto",        shortcut:"P"  },
  { mode:"line",    icon:"╱",   label:"Linha / Trecho", shortcut:"L" },
  { mode:"polygon", icon:"⬡",   label:"Polígono / Área", shortcut:"G"},
];

// ─────────────────────────────────────────────
// DrawingToolbar
// ─────────────────────────────────────────────
interface DrawingToolbarProps {
  className?: string;
  position?:  "left" | "right" | "top" | "bottom";
}

export function DrawingToolbar({ className, position = "left" }: DrawingToolbarProps) {
  const drawMode      = useMapStore(selectDrawMode);
  const setDrawMode   = useMapStore((s) => s.setDrawMode);
  const features      = useMapStore((s) => s.features);
  const draftPoints   = useMapStore((s) => s.draftPoints);
  const clearFeatures = useMapStore((s) => s.clearFeatures);
  const clearDraft    = useMapStore((s) => s.clearDraftPoints);
  const removeFeature = useMapStore((s) => s.removeFeature);
  const selectedId    = useMapStore((s) => s.selectedId);

  const isDrawing  = drawMode !== "none";
  const hasDraft   = draftPoints.length > 0;
  const hasFeatures= features.length > 0;

  // Undo: desfaz o último ponto do draft, ou remove última feature
  function handleUndo() {
    if (hasDraft) {
      useMapStore.setState((s) => ({
        draftPoints: s.draftPoints.slice(0, -1),
      }));
      return;
    }
    if (hasFeatures) {
      const last = features[features.length - 1];
      removeFeature(last.id);
    }
  }

  // Finaliza linha/polígono em construção
  function handleFinalize() {
    if ((drawMode === "line" || drawMode === "polygon") && draftPoints.length >= 2) {
      useMapStore.getState().addFeature({ type: drawMode, coords: draftPoints });
      clearDraft();
      setDrawMode("none");
    }
  }

  const positionClass = {
    left:   "absolute left-4 top-1/2 -translate-y-1/2 flex-col",
    right:  "absolute right-4 top-1/2 -translate-y-1/2 flex-col",
    top:    "absolute top-4 left-1/2 -translate-x-1/2 flex-row",
    bottom: "absolute bottom-16 left-1/2 -translate-x-1/2 flex-row",
  }[position];

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "drawing-toolbar z-toolbar flex gap-1",
          positionClass,
          className
        )}
      >
        {/* Ferramentas de desenho */}
        {TOOLS.map(({ mode, icon, label, shortcut }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setDrawMode(drawMode === mode ? "none" : mode)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  drawMode === mode
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side={position === "left" ? "right" : position === "right" ? "left" : "bottom"}>
              <span>{label}</span>
              <kbd className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
                {shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Separador */}
        <div className={cn("bg-border", position === "top" || position === "bottom" ? "w-px h-6 mx-0.5" : "h-px w-full my-0.5")} />

        {/* Finalizar (linha/polígono) */}
        {(drawMode === "line" || drawMode === "polygon") && draftPoints.length >= 2 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleFinalize}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white text-sm shadow-sm hover:bg-accent-500 transition-colors animate-fade-in"
              >
                ✓
              </button>
            </TooltipTrigger>
            <TooltipContent side={position === "left" ? "right" : "left"}>
              Finalizar {drawMode === "line" ? "trecho" : "polígono"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Undo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleUndo}
              disabled={!hasDraft && !hasFeatures}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              ↩
            </button>
          </TooltipTrigger>
          <TooltipContent side={position === "left" ? "right" : "left"}>
            <span>Desfazer</span>
            <kbd className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">Ctrl+Z</kbd>
          </TooltipContent>
        </Tooltip>

        {/* Limpar tudo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { clearFeatures(); clearDraft(); setDrawMode("none"); }}
              disabled={!hasFeatures && !hasDraft}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "text-muted-foreground hover:bg-danger-50 hover:text-danger-600"
              )}
            >
              🗑
            </button>
          </TooltipTrigger>
          <TooltipContent side={position === "left" ? "right" : "left"}>
            Limpar todos os desenhos
          </TooltipContent>
        </Tooltip>

        {/* Contador de features */}
        {hasFeatures && (
          <div className="flex h-9 w-9 items-center justify-center">
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 tabular-num">
              {features.length}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
