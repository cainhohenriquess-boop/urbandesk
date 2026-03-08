"use client";

import { useEffect, useState } from "react";
import { useMapStore, DrawnFeature } from "@/store/useMapStore";
import { MapCanvas } from "@/components/map/map-canvas";
import { DrawingToolbar } from "@/components/map/drawing-toolbar";
import { LayerPanel } from "@/components/map/layer-panel";

// ─────────────────────────────────────────────
// Conversores WKT (Well-Known Text) <-> JSON
// ─────────────────────────────────────────────
function coordsToWkt(feature: DrawnFeature): string {
  if (feature.type === "line") {
    const pts = feature.coords.map((c) => `${c.lng} ${c.lat}`).join(", ");
    return `LINESTRING(${pts})`;
  }
  if (feature.type === "polygon") {
    const pts = feature.coords.map((c) => `${c.lng} ${c.lat}`);
    if (pts[0] !== pts[pts.length - 1]) pts.push(pts[0]); // Fecha o polígono
    return `POLYGON((-(${pts.join(", ")}))`; // Sintaxe PostGIS
  }
  // Ponto padrão
  return `POINT(${feature.coords[0].lng} ${feature.coords[0].lat})`;
}

function wktToCoords(wkt: string | null) {
  if (!wkt) return [];
  const content = wkt.match(/\((.*)\)/)?.[1];
  if (!content) return [];

  const cleanContent = content.replace(/\(/g, "").replace(/\)/g, "");
  const points = cleanContent.split(",").map((p) => p.trim().split(" "));
  
  return points.map((p) => ({ lng: parseFloat(p[0]), lat: parseFloat(p[1]) }));
}

// ─────────────────────────────────────────────
// Workspace Principal
// ─────────────────────────────────────────────
export default function ProjetosPage() {
  const { features, unsavedCount, syncAll, setViewState } = useMapStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Carrega os dados do Banco ao abrir a página
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/gis");
        const json = await res.json();

        if (json.data && json.data.features) {
          const parsedFeatures: DrawnFeature[] = json.data.features.map((f: any) => {
            const props = f.properties;
            const coords = wktToCoords(props.geomWkt);

            return {
              id: props.id,
              type: props.subType || "BOCA_LOBO", // Recupera o ícone real (Hidrante, etc)
              coords: coords,
              synced: true, // Já veio do banco!
              attributes: props,
              label: props.name,
              createdAt: Date.now(),
            };
          });

          // Injeta diretamente no Zustand ignorando o "unsavedCount"
          useMapStore.setState({ features: parsedFeatures, unsavedCount: 0 });
        }
      } catch (err) {
        console.error("Erro ao carregar mapa:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // 2. Sincroniza os desenhos novos com a Nuvem
  const handleSync = async () => {
    const unsaved = features.filter((f) => !f.synced);
    if (unsaved.length === 0) return;

    setIsSyncing(true);

    try {
      const promises = unsaved.map((f) => {
        // Mapeia o front-end para o ENUM do banco (PONTO, TRECHO, AREA)
        const dbType = f.type === "line" ? "TRECHO" : f.type === "polygon" ? "AREA" : "PONTO";
        const wkt = coordsToWkt(f);

        return fetch("/api/gis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.label || "Ativo Sem Nome",
            type: dbType,
            geomWkt: wkt,
            attributes: { ...f.attributes, subType: f.type }, // Guarda qual é o ícone
          }),
        });
      });

      await Promise.all(promises);

      // Atualiza o Zustand para pintar tudo de verde (WebGL)
      syncAll();
      alert("Projetos salvos com sucesso na nuvem!");
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background relative overflow-hidden">
      {/* ── Topbar Específica do Mapa ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-lg font-bold text-foreground">
            Gestão de Projetos GIS
          </h1>
          {isLoading && (
            <span className="flex items-center gap-2 text-xs text-brand-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              Baixando dados da nuvem...
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {unsavedCount > 0 && (
            <span className="text-xs font-bold text-warning-500 bg-warning-500/10 px-3 py-1.5 rounded-full animate-pulse">
              {unsavedCount} ativo(s) pendente(s)
            </span>
          )}
          
          <button
            onClick={handleSync}
            disabled={unsavedCount === 0 || isSyncing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white transition-all rounded-lg shadow-sm
              ${unsavedCount > 0 
                ? "bg-brand-600 hover:bg-brand-500 hover:shadow-brand-500/20" 
                : "bg-slate-700 opacity-50 cursor-not-allowed"
              }`}
          >
            {isSyncing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                Sincronizando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Salvar na Nuvem
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Workspace (Mapa e Ferramentas) ── */}
      <div className="flex-1 relative w-full h-full">
        {/* Camada do Mapa */}
        <div className="absolute inset-0">
          <MapCanvas />
        </div>

        {/* Ferramentas Flutuantes */}
        <DrawingToolbar />
        <LayerPanel className="absolute right-4 top-4 w-64 shadow-2xl" />
      </div>
    </div>
  );
}