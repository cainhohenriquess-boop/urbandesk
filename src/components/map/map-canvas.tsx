"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Source, Layer, NavigationControl, MapLayerMouseEvent } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4emhvYXJvMDBmMDJqc2c2cjVqcGZxNiJ9.dummy";

// O OSM Raster foi removido do menu. Agora o padrão ou é satélite ou é topo.
const SATELLITE_STYLE = { version: 8, sources: { satellite: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Tiles © Esri" } }, layers: [{ id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19 }] };
const TOPO_STYLE = { version: 8, sources: { topo: { type: "raster", tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenTopoMap" } }, layers: [{ id: "topo-layer", type: "raster", source: "topo", minzoom: 0, maxzoom: 17 }] };

const ASSET_STYLES = {
  BOCA_LOBO: { color: "bg-blue-500", hex: "#3b82f6", ring: "ring-blue-500/50", icon: "💧", label: "Boca de Lobo" },
  POCO_VISITA: { color: "bg-slate-600", hex: "#475569", ring: "ring-slate-600/50", icon: "🕳️", label: "Poço de Visita" },
  HIDRANTE: { color: "bg-red-500", hex: "#ef4444", ring: "ring-red-500/50", icon: "🚒", label: "Hidrante" },
  POSTE_LUZ: { color: "bg-yellow-400", hex: "#facc15", ring: "ring-yellow-400/50", icon: "💡", label: "Poste de Luz" },
  BURACO: { color: "bg-amber-600", hex: "#d97706", ring: "ring-amber-600/50", icon: "🚧", label: "Buraco" },
  // ... (Outros mantidos para brevidade)
};

function EngineeringPanel() {
  const { pendingFeature, cancelPendingFeature, confirmPendingFeature } = useMapStore();
  const [formData, setFormData] = useState({ nome: "", status: "PROJETADO", custoEstimado: "", material: "CONCRETO", observacoes: "" });

  if (!pendingFeature) return null;
  const isGeometry = pendingFeature.type === "line" || pendingFeature.type === "polygon";
  const title = isGeometry ? (pendingFeature.type === "line" ? "Nova Rede/Trecho" : "Nova Área/Lote") : pendingFeature.type;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex justify-between mb-1"><span className="text-[10px] font-bold uppercase text-brand-500">Modo Projeto</span><button onClick={cancelPendingFeature}>✕</button></div>
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); confirmPendingFeature({ custo: Number(formData.custoEstimado), material: formData.material }, formData.nome); }} className="flex-1 p-4 space-y-4">
        <div><label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label><input type="text" required value={formData.nome} onChange={e => setFormData(s => ({...s, nome: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2" /></div>
        <div><label className="text-xs font-semibold text-muted-foreground uppercase">Custo (R$)</label><input type="number" step="0.01" value={formData.custoEstimado} onChange={e => setFormData(s => ({...s, custoEstimado: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2" /></div>
        <div className="pt-4 flex gap-2"><button type="submit" className="flex-1 py-2 rounded-md bg-brand-600 text-white font-bold">Salvar Ativo</button></div>
      </form>
    </div>
  );
}

export function MapCanvas() {
  const { features, drawMode, viewState, setViewState, addDraftPoint, draftPoints, finishDraft, layers, mapStyle, baseLayersData } = useMapStore();

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (drawMode === "SELECT") return;
    addDraftPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault();
    if (drawMode === "line" || drawMode === "polygon") finishDraft();
  };

  const geometryFeatures = features.filter(f => f.type === "line" || f.type === "polygon");
  const activeMapStyle = mapStyle === "topography" ? TOPO_STYLE : SATELLITE_STYLE; // Satélite é o padrão agora

  const draftGeoJson = useMemo(() => {
    if (draftPoints.length === 0 || (drawMode !== "line" && drawMode !== "polygon")) return null;
    const coords = draftPoints.map(p => [p.lng, p.lat]);
    const feats: any[] = [];
    if (coords.length > 1) {
      if (drawMode === "polygon" && coords.length > 2) feats.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] } });
      else feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: coords } });
    }
    return { type: "FeatureCollection", features: feats };
  }, [draftPoints, drawMode]);

  return (
    <div className="h-full w-full relative bg-[#e5e7eb] overflow-hidden" onContextMenu={handleContextMenu}>
      <EngineeringPanel />
      <Map {...viewState} onMove={evt => setViewState(evt.viewState)} mapStyle={activeMapStyle as any} mapboxAccessToken={MAPBOX_TOKEN} onClick={handleMapClick} cursor={drawMode !== "SELECT" ? "crosshair" : "grab"}>
        <NavigationControl position="bottom-right" />

        {/* 🚀 Renderização de Shapefiles com Estilo Enterprise (Apenas Contornos) */}
        {layers.basegis && baseLayersData.map((layer) => (
          <Source key={`src-${layer.id}`} id={`source-${layer.id}`} type="geojson" data={layer.geoJsonData}>
            
            {/* 1. LIMITE DO MUNICÍPIO: Linha pontilhada visível, fundo quase imperceptível */}
            {layer.type === "BOUNDARY" && (
               <>
                 <Layer id={`fill-${layer.id}`} type="fill" paint={{ "fill-color": "#ffffff", "fill-opacity": 0.05 }} />
                 <Layer id={`line-${layer.id}`} type="line" paint={{ "line-color": "#facc15", "line-width": 3, "line-dasharray": [2, 4] }} />
               </>
            )}

            {/* 2. RUAS/BUFFERS (Polígonos): Apenas o contorno exato da rua desenhado por cima da imagem real */}
            {layer.type === "STREETS" && (
               <Layer id={`street-buffer-${layer.id}`} type="line" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "line-color": "#0ea5e9", "line-width": 1.5, "line-opacity": 0.8 }} />
            )}

            {/* 3. NOMES DAS RUAS (Linhas com atributo 'name') */}
            {layer.type === "STREET_NAMES" && (
               <Layer id={`street-name-${layer.id}`} type="symbol" filter={["==", ["geometry-type"], "LineString"]} layout={{ "text-field": ["get", "name"], "text-size": 13, "symbol-placement": "line", "text-letter-spacing": 0.1 }} paint={{ "text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 2 }} />
            )}
          </Source>
        ))}

        {draftGeoJson && (
          <Source id="draft-source" type="geojson" data={draftGeoJson as any}>
            <Layer id="draft-polygon-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.3 }} />
            <Layer id="draft-line" type="line" filter={["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]]} paint={{ "line-color": "#3b82f6", "line-width": 3, "line-dasharray": [2, 2] }} />
          </Source>
        )}
      </Map>
    </div>
  );
}