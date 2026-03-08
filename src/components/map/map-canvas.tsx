"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Source, Layer, NavigationControl, MapLayerMouseEvent } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4emhvYXJvMDBmMDJqc2c2cjVqcGZxNiJ9.dummy";

const OSM_STYLE = { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm-layer", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }] };
const SATELLITE_STYLE = { version: 8, sources: { satellite: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Tiles © Esri" } }, layers: [{ id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19 }] };
const TOPO_STYLE = { version: 8, sources: { topo: { type: "raster", tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenTopoMap" } }, layers: [{ id: "topo-layer", type: "raster", source: "topo", minzoom: 0, maxzoom: 17 }] };

const ASSET_STYLES = {
  BOCA_LOBO:      { color: "bg-blue-500",    hex: "#3b82f6", ring: "ring-blue-500/50",    icon: "💧", label: "Boca de Lobo" },
  POCO_VISITA:    { color: "bg-slate-600",   hex: "#475569", ring: "ring-slate-600/50",   icon: "🕳️", label: "Poço de Visita" },
  HIDRANTE:       { color: "bg-red-500",     hex: "#ef4444", ring: "ring-red-500/50",     icon: "🚒", label: "Hidrante" },
  SEMAFORO:       { color: "bg-amber-500",   hex: "#f59e0b", ring: "ring-amber-500/50",   icon: "🚦", label: "Semáforo" },
  PLACA_TRANSITO: { color: "bg-red-600",     hex: "#dc2626", ring: "ring-red-600/50",     icon: "🛑", label: "Placa de Trânsito" },
  LOMBADA:        { color: "bg-orange-500",  hex: "#f97316", ring: "ring-orange-500/50",  icon: "〰️", label: "Lombada" },
  PONTO_ONIBUS:   { color: "bg-cyan-500",    hex: "#06b6d4", ring: "ring-cyan-500/50",    icon: "🚏", label: "Ponto de Ônibus" },
  RADAR:          { color: "bg-slate-700",   hex: "#334155", ring: "ring-slate-700/50",   icon: "📸", label: "Radar" },
  POSTE_LUZ:      { color: "bg-yellow-400",  hex: "#facc15", ring: "ring-yellow-400/50",  icon: "💡", label: "Poste de Luz" },
  ARVORE:         { color: "bg-emerald-500", hex: "#10b981", ring: "ring-emerald-500/50", icon: "🌳", label: "Árvore" },
  LIXEIRA:        { color: "bg-zinc-500",    hex: "#71717a", ring: "ring-zinc-500/50",    icon: "🗑️", label: "Lixeira" },
  BURACO:         { color: "bg-amber-600",   hex: "#d97706", ring: "ring-amber-600/50",   icon: "🚧", label: "Buraco" },
};

function EngineeringPanel() {
  const { pendingFeature, cancelPendingFeature, confirmPendingFeature } = useMapStore();
  const [formData, setFormData] = useState({ nome: "", status: "PROJETADO", custoEstimado: "", material: "CONCRETO", observacoes: "" });

  if (!pendingFeature) return null;

  const isGeometry = pendingFeature.type === "line" || pendingFeature.type === "polygon";
  const title = isGeometry ? (pendingFeature.type === "line" ? "Nova Rede/Trecho" : "Nova Área/Lote") : ASSET_STYLES[pendingFeature.type as keyof typeof ASSET_STYLES]?.label || pendingFeature.type;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmPendingFeature({ status: formData.status, custo: formData.custoEstimado ? Number(formData.custoEstimado) : 0, material: formData.material, obs: formData.observacoes }, formData.nome);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-50 flex flex-col animate-slide-left">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded">Modo Projeto</span>
          <button onClick={cancelPendingFeature} className="text-muted-foreground hover:text-danger-500 transition-colors">✕</button>
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label><input type="text" required value={formData.nome} onChange={e => setFormData(s => ({...s, nome: e.target.value}))} placeholder="Ex: Rede Pluvial" className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500"/></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Status</label><select value={formData.status} onChange={e => setFormData(s => ({...s, status: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500"><option value="PROJETADO">Projetado</option><option value="EM_EXECUCAO">Em Execução</option><option value="CONCLUIDO">Concluído</option></select></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Custo Estimado (R$)</label><input type="number" step="0.01" value={formData.custoEstimado} onChange={e => setFormData(s => ({...s, custoEstimado: e.target.value}))} placeholder="0.00" className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500"/></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Material</label><select value={formData.material} onChange={e => setFormData(s => ({...s, material: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500"><option value="CONCRETO">Concreto</option><option value="PVC">PVC</option><option value="ASFALTO">Asfalto</option></select></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground uppercase">Obs</label><textarea rows={2} value={formData.observacoes} onChange={e => setFormData(s => ({...s, observacoes: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500 resize-none"/></div>
        <div className="pt-4 border-t border-border flex gap-2"><button type="button" onClick={cancelPendingFeature} className="flex-1 py-2 rounded-md bg-muted text-foreground text-sm font-medium hover:bg-muted/80">Cancelar</button><button type="submit" className="flex-1 py-2 rounded-md bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 shadow-sm">Salvar</button></div>
      </form>
    </div>
  );
}

export function MapCanvas() {
  const { 
    features, drawMode, viewState, setViewState, 
    addDraftPoint, draftPoints, finishDraft, layers, mapStyle,
    isFullscreen, toggleFullscreen, baseLayersData // NOVO: Puxa os Shapefiles
  } = useMapStore();

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (drawMode === "SELECT") return;
    addDraftPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault();
    if (drawMode === "line" || drawMode === "polygon") finishDraft();
  };

  const geometryFeatures = features.filter(f => f.type === "line" || f.type === "polygon");
  const assetFeatures = features.filter(f => f.type !== "line" && f.type !== "polygon");
  const syncedAssets = assetFeatures.filter(f => f.synced);
  const unsyncedAssets = assetFeatures.filter(f => !f.synced);

  const activeMapStyle = mapStyle === "satellite" ? SATELLITE_STYLE : mapStyle === "topography" ? TOPO_STYLE : OSM_STYLE;

  const geometriesGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: geometryFeatures.map(f => {
        const coords = f.coords.map(c => [c.lng, c.lat]);
        if (f.type === "polygon" && coords.length > 2) coords.push([f.coords[0].lng, f.coords[0].lat]);
        return { type: "Feature", geometry: { type: f.type === "line" ? "LineString" : "Polygon", coordinates: f.type === "line" ? coords : [coords] }, properties: { id: f.id, color: f.color || "#3b82f6" } }
      })
    };
  }, [geometryFeatures]);

  const draftGeoJson = useMemo(() => {
    if (draftPoints.length === 0 || (drawMode !== "line" && drawMode !== "polygon")) return null;
    const coords = draftPoints.map(p => [p.lng, p.lat]);
    const feats: any[] = [];
    coords.forEach(c => feats.push({ type: "Feature", geometry: { type: "Point", coordinates: c } }));
    if (coords.length > 1) {
      if (drawMode === "polygon" && coords.length > 2) feats.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] } });
      else feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: coords } });
    }
    return { type: "FeatureCollection", features: feats };
  }, [draftPoints, drawMode]);

  const syncedAssetsGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: syncedAssets.map(f => {
        const style = ASSET_STYLES[f.type as keyof typeof ASSET_STYLES];
        return { type: "Feature", geometry: { type: "Point", coordinates: [f.coords[0].lng, f.coords[0].lat] }, properties: { id: f.id, type: f.type, icon: style?.icon || "📍", color: style?.hex || "#ffffff" } };
      })
    };
  }, [syncedAssets]);

  return (
    <div className="h-full w-full relative bg-[#e5e7eb] overflow-hidden" onContextMenu={handleContextMenu}>
      <EngineeringPanel />
      
      <button onClick={toggleFullscreen} className="absolute top-4 right-14 z-40 bg-card text-foreground border border-border p-2 rounded-lg shadow-md hover:bg-muted transition-colors" title="Tela Cheia">
        {isFullscreen ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 5l5-5m0 0v4m0-4h-4m-6 5l-5 5m0 0v-4m0 4h4m6-5l5 5m0 0v-4m0 4h-4" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
      </button>

      <Map {...viewState} onMove={evt => setViewState(evt.viewState)} mapStyle={activeMapStyle as any} mapboxAccessToken={MAPBOX_TOKEN} onClick={handleMapClick} cursor={drawMode !== "SELECT" ? "crosshair" : "grab"}>
        <NavigationControl position="bottom-right" />

        {/* 🚀 MÁGICA ENTERPRISE: Renderizando os Shapefiles do Servidor */}
        {layers.basegis && baseLayersData.map((layer) => (
          <Source key={`src-${layer.id}`} id={`source-${layer.id}`} type="geojson" data={layer.geoJsonData}>
            {layer.type === "BOUNDARY" && (
               <>
                 <Layer id={`fill-${layer.id}`} type="fill" paint={{ "fill-color": "#6366f1", "fill-opacity": 0.08 }} />
                 <Layer id={`line-${layer.id}`} type="line" paint={{ "line-color": "#4f46e5", "line-width": 2, "line-dasharray": [2, 2] }} />
               </>
            )}
            {layer.type === "STREETS" && (
               <Layer id={`street-${layer.id}`} type="line" paint={{ "line-color": "#94a3b8", "line-width": 1.5, "line-opacity": 0.6 }} />
            )}
          </Source>
        ))}

        {draftGeoJson && (
          <Source id="draft-source" type="geojson" data={draftGeoJson as any}>
            <Layer id="draft-polygon-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.3 }} />
            <Layer id="draft-line" type="line" filter={["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]]} paint={{ "line-color": "#3b82f6", "line-width": 3, "line-dasharray": [2, 2] }} />
            <Layer id="draft-points" type="circle" filter={["==", ["geometry-type"], "Point"]} paint={{ "circle-color": "#ffffff", "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": "#3b82f6" }} />
          </Source>
        )}

        {layers.obras && (
          <Source id="geometries" type="geojson" data={geometriesGeoJson as any}>
            <Layer id="lines" type="line" filter={["==", ["geometry-type"], "LineString"]} paint={{ "line-color": ["get", "color"], "line-width": 4 }} />
            <Layer id="polygons-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.3 }} />
            <Layer id="polygons-stroke" type="line" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "line-color": ["get", "color"], "line-width": 2 }} />
          </Source>
        )}

        {layers.ativos && (
          <Source id="synced-assets" type="geojson" data={syncedAssetsGeoJson as any}>
            <Layer id="synced-assets-circle" type="circle" paint={{ "circle-color": ["get", "color"], "circle-radius": 14, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff", "circle-pitch-alignment": "map" }} />
            <Layer id="synced-assets-symbol" type="symbol" layout={{ "text-field": ["get", "icon"], "text-size": 14, "text-allow-overlap": true, "text-pitch-alignment": "map" }} />
          </Source>
        )}

        {layers.ativos && unsyncedAssets.map((feature) => {
          const style = ASSET_STYLES[feature.type as keyof typeof ASSET_STYLES];
          if (!style || !feature.coords[0]) return null;
          return (
            <Marker key={feature.id} longitude={feature.coords[0].lng} latitude={feature.coords[0].lat} anchor="bottom">
              <div className="relative group flex flex-col items-center cursor-pointer">
                <div className="absolute -top-12 hidden group-hover:flex items-center whitespace-nowrap rounded-lg bg-card px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-xl border border-border flex-col">
                  <span>{feature.label || style.label}</span>
                  <span className="text-warning-500 text-[9px] flex items-center gap-1 mt-0.5"><span className="h-1 w-1 bg-warning-500 rounded-full animate-ping"/>Não Salvo</span>
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center">
                  <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", style.color)} />
                  <div className={cn("relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[13px] shadow-md transition-transform group-hover:scale-125 ring-4", style.color, style.ring)}>{style.icon}</div>
                </div>
                <div className="h-3 w-[2px] bg-white/90 shadow-sm rounded-b-full" />
              </div>
            </Marker>
          );
        })}
      </Map>
      
      {drawMode !== "SELECT" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-brand-400 bg-brand-600/90 backdrop-blur-md px-6 py-2.5 text-sm font-bold text-white shadow-2xl animate-bounce flex items-center gap-2 pointer-events-none z-40">
          {drawMode === "line" || drawMode === "polygon" ? <>Clique para adicionar vértices. <kbd className="bg-white/20 px-1 text-black font-mono font-bold rounded">Botão Direito</kbd> finaliza.</> : <>Clique no mapa para projetar: {ASSET_STYLES[drawMode as keyof typeof ASSET_STYLES]?.label}</>}
        </div>
      )}
    </div>
  );
}