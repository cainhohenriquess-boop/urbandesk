"use client";

import { useMemo } from "react";
import Map, { Marker, Source, Layer, NavigationControl, MapLayerMouseEvent } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

// Não precisa de token válido para tiles raster de terceiros, 
// mas a biblioteca exige a prop. Passamos um dummy.
const MAPBOX_TOKEN = "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4emhvYXJvMDBmMDJqc2c2cjVqcGZxNiJ9.dummy";

// ─────────────────────────────────────────────
// Estilos de Mapas (Raster Tiles Gratuitos)
// ─────────────────────────────────────────────
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap" }
  },
  layers: [{ id: "osm-layer", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }]
};

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Tiles © Esri" }
  },
  layers: [{ id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19 }]
};

const TOPO_STYLE = {
  version: 8,
  sources: {
    topo: { type: "raster", tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenTopoMap" }
  },
  layers: [{ id: "topo-layer", type: "raster", source: "topo", minzoom: 0, maxzoom: 17 }]
};

// ─────────────────────────────────────────────
// Estilização de Ativos B2G
// ─────────────────────────────────────────────
const ASSET_STYLES = {
  BOCA_LOBO:      { color: "bg-blue-500",    hex: "#3b82f6", ring: "ring-blue-500/50",    icon: "💧" },
  POCO_VISITA:    { color: "bg-slate-600",   hex: "#475569", ring: "ring-slate-600/50",   icon: "🕳️" },
  HIDRANTE:       { color: "bg-red-500",     hex: "#ef4444", ring: "ring-red-500/50",     icon: "🚒" },
  SEMAFORO:       { color: "bg-amber-500",   hex: "#f59e0b", ring: "ring-amber-500/50",   icon: "🚦" },
  PLACA_TRANSITO: { color: "bg-red-600",     hex: "#dc2626", ring: "ring-red-600/50",     icon: "🛑" },
  LOMBADA:        { color: "bg-orange-500",  hex: "#f97316", ring: "ring-orange-500/50",  icon: "〰️" },
  PONTO_ONIBUS:   { color: "bg-cyan-500",    hex: "#06b6d4", ring: "ring-cyan-500/50",    icon: "🚏" },
  RADAR:          { color: "bg-slate-700",   hex: "#334155", ring: "ring-slate-700/50",   icon: "📸" },
  POSTE_LUZ:      { color: "bg-yellow-400",  hex: "#facc15", ring: "ring-yellow-400/50",  icon: "💡" },
  ARVORE:         { color: "bg-emerald-500", hex: "#10b981", ring: "ring-emerald-500/50", icon: "🌳" },
  LIXEIRA:        { color: "bg-zinc-500",    hex: "#71717a", ring: "ring-zinc-500/50",    icon: "🗑️" },
  BURACO:         { color: "bg-amber-600",   hex: "#d97706", ring: "ring-amber-600/50",   icon: "🚧" },
};

export function MapCanvas() {
  const { 
    features, drawMode, viewState, setViewState, 
    addDraftPoint, draftPoints, finishDraft, layers, mapStyle 
  } = useMapStore();

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (drawMode === "SELECT") return;
    addDraftPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault();
    if (drawMode === "line" || drawMode === "polygon") {
      finishDraft();
    }
  };

  const geometryFeatures = features.filter(f => f.type === "line" || f.type === "polygon");
  const assetFeatures = features.filter(f => f.type !== "line" && f.type !== "polygon");

  const syncedAssets = assetFeatures.filter(f => f.synced);
  const unsyncedAssets = assetFeatures.filter(f => !f.synced);

  // Seleciona o estilo JSON correspondente
  const activeMapStyle = mapStyle === "satellite" ? SATELLITE_STYLE 
                       : mapStyle === "topography" ? TOPO_STYLE 
                       : OSM_STYLE;

  // 1. Camada de Obras (Polígonos e Linhas já concluídos)
  const geometriesGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: geometryFeatures.map(f => {
        // Polígonos no GeoJSON exigem que a primeira e a última coordenada sejam idênticas para fechar.
        const coords = f.coords.map(c => [c.lng, c.lat]);
        if (f.type === "polygon" && coords.length > 2) {
          coords.push([f.coords[0].lng, f.coords[0].lat]); // fecha o polígono
        }

        return {
          type: "Feature",
          geometry: {
            type: f.type === "line" ? "LineString" : "Polygon",
            coordinates: f.type === "line" ? coords : [coords]
          },
          properties: { id: f.id, color: f.color || "#3468f6" }
        }
      })
    };
  }, [geometryFeatures]);

  // 2. Camada de Rascunho (Feedback Visual MUDANDO TUDO!)
  // Isso desenha vértices e linhas em tempo real à medida que o usuário clica
  const draftGeoJson = useMemo(() => {
    if (draftPoints.length === 0 || (drawMode !== "line" && drawMode !== "polygon")) return null;
    
    const coords = draftPoints.map(p => [p.lng, p.lat]);
    const feats: any[] = [];

    // Desenha os vértices (pontinhos clicados)
    coords.forEach(c => feats.push({ type: "Feature", geometry: { type: "Point", coordinates: c } }));

    // Desenha as linhas conectando os pontos
    if (coords.length > 1) {
      if (drawMode === "polygon" && coords.length > 2) {
        // Polígono dinâmico
        feats.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] }
        });
      } else {
        // Linha simples (ou início de um polígono)
        feats.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords }
        });
      }
    }

    return { type: "FeatureCollection", features: feats };
  }, [draftPoints, drawMode]);

  // 3. Fonte de dados GPU para ativos massivos
  const syncedAssetsGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: syncedAssets.map(f => {
        const style = ASSET_STYLES[f.type as keyof typeof ASSET_STYLES];
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [f.coords[0].lng, f.coords[0].lat]
          },
          properties: {
            id: f.id,
            type: f.type,
            icon: style?.icon || "📍",
            color: style?.hex || "#ffffff"
          }
        };
      })
    };
  }, [syncedAssets]);

  return (
    <div className="h-full w-full relative bg-[#e5e7eb]" onContextMenu={handleContextMenu}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={activeMapStyle as any}
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        cursor={drawMode !== "SELECT" ? "crosshair" : "grab"}
      >
        <NavigationControl position="bottom-right" />

        {/* --- DRAFT (Feedback Visual em Tempo Real) --- */}
        {draftGeoJson && (
          <Source id="draft-source" type="geojson" data={draftGeoJson as any}>
            {/* O preenchimento transparente do polígono rascunho */}
            <Layer id="draft-polygon-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": "#10b981", "fill-opacity": 0.3 }} />
            {/* As linhas (tracejadas) indicando o rascunho */}
            <Layer id="draft-line" type="line" filter={["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]]} paint={{ "line-color": "#10b981", "line-width": 3, "line-dasharray": [2, 2] }} />
            {/* Os vértices clicados */}
            <Layer id="draft-points" type="circle" filter={["==", ["geometry-type"], "Point"]} paint={{ "circle-color": "#ffffff", "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": "#10b981" }} />
          </Source>
        )}

        {/* --- LINHAS E POLÍGONOS FINALIZADOS --- */}
        {layers.obras && (
          <Source id="geometries" type="geojson" data={geometriesGeoJson as any}>
            <Layer 
              id="lines" type="line" 
              filter={["==", ["geometry-type"], "LineString"]}
              paint={{ "line-color": ["get", "color"], "line-width": 4 }} 
            />
            <Layer 
              id="polygons-fill" type="fill" 
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.3 }} 
            />
            <Layer 
              id="polygons-stroke" type="line" 
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{ "line-color": ["get", "color"], "line-width": 2 }} 
            />
          </Source>
        )}

        {/* --- ATIVOS SINCRONIZADOS (WebGL Massivo) --- */}
        {layers.ativos && (
          <Source id="synced-assets" type="geojson" data={syncedAssetsGeoJson as any}>
            <Layer 
              id="synced-assets-circle" 
              type="circle" 
              paint={{ 
                "circle-color": ["get", "color"], 
                "circle-radius": 14, 
                "circle-stroke-width": 2, 
                "circle-stroke-color": "#ffffff",
                "circle-pitch-alignment": "map"
              }} 
            />
            <Layer 
              id="synced-assets-symbol" 
              type="symbol" 
              layout={{ 
                "text-field": ["get", "icon"], 
                "text-size": 14, 
                "text-allow-overlap": true,
                "text-pitch-alignment": "map"
              }} 
            />
          </Source>
        )}

        {/* --- ATIVOS PENDENTES (Animação UI) --- */}
        {layers.ativos && unsyncedAssets.map((feature) => {
          const style = ASSET_STYLES[feature.type as keyof typeof ASSET_STYLES];
          if (!style || !feature.coords[0]) return null;
          
          return (
            <Marker
              key={feature.id}
              longitude={feature.coords[0].lng}
              latitude={feature.coords[0].lat}
              anchor="bottom"
            >
              <div className="relative group flex flex-col items-center cursor-pointer">
                <div className="absolute -top-10 hidden group-hover:flex items-center whitespace-nowrap rounded-lg bg-card px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-xl border border-border">
                  {feature.type.replace("_", " ")}
                  <span className="ml-2 flex items-center gap-1 text-warning-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning-500 animate-pulse" />
                    Pendente
                  </span>
                </div>

                <div className="relative flex h-8 w-8 items-center justify-center">
                  <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", style.color)} />
                  <div className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-125 ring-4",
                    style.color,
                    style.ring
                  )}>
                    {style.icon}
                  </div>
                </div>
                <div className="h-3 w-[2px] bg-white/90 shadow-sm rounded-b-full" />
                <div className="w-4 h-1 bg-black/40 rounded-[100%] blur-[1px]" />
              </div>
            </Marker>
          );
        })}
      </Map>
      
      {drawMode !== "SELECT" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-brand-400 bg-brand-600/90 backdrop-blur-md px-6 py-2.5 text-sm font-bold text-white shadow-2xl animate-bounce flex items-center gap-2 pointer-events-none">
          {drawMode === "line" || drawMode === "polygon" ? (
            <>Clique para adicionar vértices. <kbd className="bg-white/20 px-1 text-black font-mono font-bold rounded">Botão Direito</kbd> finaliza.</>
          ) : (
            <>Clique no mapa para fixar: {drawMode.replace("_", " ")}</>
          )}
        </div>
      )}
    </div>
  );
}