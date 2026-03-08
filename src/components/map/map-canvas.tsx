"use client";

import React, { useMemo, useState, useEffect } from "react";
// 🚀 MapLibre Oficial: Zero Mapbox, Zero Tokens, Zero CORS!
import Map, { Marker, Source, Layer, NavigationControl, MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Estilos de Mapa Base (Livres e Independentes)
// ─────────────────────────────────────────────
const GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

const BLANK_STYLE = {
  version: 8,
  name: "Base Cartográfica",
  glyphs: GLYPHS_URL,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#ffffff" } // Fundo Branco Perfeito
    }
  ]
};

const SATELLITE_STYLE = { 
  version: 8, 
  glyphs: GLYPHS_URL,
  sources: { satellite: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Tiles © Esri" } }, 
  layers: [{ id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19 }] 
};

const TOPO_STYLE = { 
  version: 8, 
  glyphs: GLYPHS_URL,
  sources: { topo: { type: "raster", tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenTopoMap" } }, 
  layers: [{ id: "topo-layer", type: "raster", source: "topo", minzoom: 0, maxzoom: 17 }] 
};

// ─────────────────────────────────────────────
// Estilos de Ativos Urbanos
// ─────────────────────────────────────────────
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
        <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded">Modo Projeto</span><button onClick={cancelPendingFeature} className="text-muted-foreground hover:text-danger-500">✕</button></div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div><label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label><input type="text" required value={formData.nome} onChange={e => setFormData(s => ({...s, nome: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500" /></div>
        <div><label className="text-xs font-semibold text-muted-foreground uppercase">Status</label><select value={formData.status} onChange={e => setFormData(s => ({...s, status: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500"><option value="PROJETADO">Projetado</option><option value="EM_EXECUCAO">Em Execução</option><option value="CONCLUIDO">Concluído</option></select></div>
        <div><label className="text-xs font-semibold text-muted-foreground uppercase">Custo (R$)</label><input type="number" step="0.01" value={formData.custoEstimado} onChange={e => setFormData(s => ({...s, custoEstimado: e.target.value}))} className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500" /></div>
        <div className="pt-4 flex gap-2"><button type="button" onClick={cancelPendingFeature} className="flex-1 py-2 rounded-md bg-muted font-medium">Cancelar</button><button type="submit" className="flex-1 py-2 rounded-md bg-brand-600 text-white font-bold">Salvar</button></div>
      </form>
    </div>
  );
}

export function MapCanvas() {
  const { features, drawMode, viewState, setViewState, addDraftPoint, draftPoints, finishDraft, layers, mapStyle, isFullscreen, toggleFullscreen, baseLayersData } = useMapStore();
  const [utmWarning, setUtmWarning] = useState(false);

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

  const activeMapStyle = mapStyle === "topography" ? TOPO_STYLE : mapStyle === "satellite" ? SATELLITE_STYLE : BLANK_STYLE;

  // 🚀 RADAR UTM: Lê as coordenadas do Shapefile. Se for maior que 180 graus, é porque está em Metros (UTM/SIRGAS)
  useEffect(() => {
    let isUtm = false;
    if (baseLayersData && baseLayersData.length > 0) {
      baseLayersData.forEach(layer => {
        try {
          let p = typeof layer.geoJsonData === 'string' ? JSON.parse(layer.geoJsonData) : layer.geoJsonData;
          if (Array.isArray(p)) p = p[0];
          
          const checkCoords = (coords: any[]) => {
            if (typeof coords[0] === 'number') {
              if (Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) isUtm = true;
            } else if (Array.isArray(coords)) {
              checkCoords(coords[0]);
            }
          };

          if (p?.features?.length > 0 && p.features[0].geometry) {
            checkCoords(p.features[0].geometry.coordinates);
          }
        } catch(e){}
      });
    }
    setUtmWarning(isUtm);
  }, [baseLayersData]);

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
    <div className="h-full w-full relative bg-[#ffffff] overflow-hidden" onContextMenu={handleContextMenu}>
      <EngineeringPanel />

      {/* AVISO DE DATUM ERRADO (UTM/SIRGAS 2000) */}
      {utmWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-danger-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <p className="font-bold text-sm">Erro de Coordenadas (UTM Detectado)</p>
            <p className="text-xs opacity-90">O seu Shapefile está em Metros. Abra no QGIS e exporte como <strong>EPSG:4326 (WGS 84)</strong>.</p>
          </div>
        </div>
      )}

      <button onClick={toggleFullscreen} className="absolute top-4 right-14 z-40 bg-card/90 backdrop-blur-md text-foreground border border-border p-2 rounded-lg shadow-md hover:bg-muted transition-colors">
        {isFullscreen ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 5l5-5m0 0v4m0-4h-4m-6 5l-5 5m0 0v-4m0 4h4m6-5l5 5m0 0v-4m0 4h-4" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
      </button>

      <Map 
        {...viewState} 
        onMove={evt => setViewState(evt.viewState)} 
        mapStyle={activeMapStyle as any} 
        onClick={handleMapClick} 
        cursor={drawMode !== "SELECT" ? "crosshair" : "grab"}
      >
        <NavigationControl position="bottom-right" />

        {/* ── CAMADAS CARTOGRÁFICAS ── */}
        {layers.basegis && baseLayersData.map((layer) => {
          const sourceId = `source-${layer.id}`;
          
          let parsedData = typeof layer.geoJsonData === 'string' ? JSON.parse(layer.geoJsonData) : layer.geoJsonData;
          if (Array.isArray(parsedData)) parsedData = parsedData[0];
          const safeData = parsedData?.type === "FeatureCollection" ? parsedData : { type: "FeatureCollection", features: [] };

          return (
            <Source key={`src-${layer.id}`} id={sourceId} type="geojson" data={safeData}>
              {/* O MapLibre ignora automaticamente o que não é compátivel. Removemos o filtro restrito que quebrava o mapa! */}
              {layer.type === "BOUNDARY" && <Layer id={`fill-${layer.id}`} type="fill" paint={{ "fill-color": "#0ea5e9", "fill-opacity": 0.05 }} />}
              {layer.type === "BOUNDARY" && <Layer id={`line-${layer.id}`} type="line" paint={{ "line-color": "#0ea5e9", "line-width": 3, "line-dasharray": [2, 4] }} />}

              {layer.type === "STREETS" && <Layer id={`street-fill-${layer.id}`} type="fill" paint={{ "fill-color": "#f1f5f9", "fill-opacity": 0.8 }} />}
              {layer.type === "STREETS" && <Layer id={`street-border-${layer.id}`} type="line" paint={{ "line-color": "#94a3b8", "line-width": 1.5 }} />}

              {layer.type === "STREET_NAMES" && (
                 <Layer 
                   id={`street-name-${layer.id}`} 
                   type="symbol" 
                   layout={{ 
                     "text-field": ["coalesce", ["get", "name"], ["get", "NAME"], ["get", "NOME"], ["get", "Rua"], ["get", "rua"]], 
                     "text-size": 13, 
                     "symbol-placement": "line", 
                     "text-max-angle": 38
                   }} 
                   paint={{ 
                     "text-color": "#1e293b", 
                     "text-halo-color": "#ffffff", 
                     "text-halo-width": 2 
                   }} 
                 />
              )}
            </Source>
          );
        })}

        {/* ── RASCUNHOS E OBRAS ── */}
        {draftGeoJson && (
          <Source id="draft-source" type="geojson" data={draftGeoJson as any}>
            <Layer id="draft-polygon-fill" type="fill" paint={{ "fill-color": "#10b981", "fill-opacity": 0.3 }} />
            <Layer id="draft-line" type="line" paint={{ "line-color": "#10b981", "line-width": 3, "line-dasharray": [2, 2] }} />
            <Layer id="draft-points" type="circle" paint={{ "circle-color": "#ffffff", "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": "#10b981" }} />
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
            <Layer id="synced-assets-circle" type="circle" paint={{ "circle-color": ["get", "color"], "circle-radius": 14, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" }} />
            <Layer id="synced-assets-symbol" type="symbol" layout={{ "text-field": ["get", "icon"], "text-size": 14 }} />
          </Source>
        )}
      </Map>
    </div>
  );
}