"use client";

import { useMemo } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiZGVtbyIsImEiOiJjbHh6aG9hcm8wMGYwMmpzZzZyNWpwZnE2In0.mock-token-substitua-no-env";

const ASSET_STYLES = {
  BOCA_LOBO:      { color: "bg-blue-500",    ring: "ring-blue-500/50",    icon: "💧" },
  POCO_VISITA:    { color: "bg-slate-600",   ring: "ring-slate-600/50",   icon: "🕳️" },
  HIDRANTE:       { color: "bg-red-500",     ring: "ring-red-500/50",     icon: "🚒" },
  SEMAFORO:       { color: "bg-amber-500",   ring: "ring-amber-500/50",   icon: "🚦" },
  PLACA_TRANSITO: { color: "bg-red-600",     ring: "ring-red-600/50",     icon: "🛑" },
  LOMBADA:        { color: "bg-orange-500",  ring: "ring-orange-500/50",  icon: "〰️" },
  PONTO_ONIBUS:   { color: "bg-cyan-500",    ring: "ring-cyan-500/50",    icon: "🚏" },
  RADAR:          { color: "bg-slate-700",   ring: "ring-slate-700/50",   icon: "📸" },
  POSTE_LUZ:      { color: "bg-yellow-400",  ring: "ring-yellow-400/50",  icon: "💡" },
  ARVORE:         { color: "bg-emerald-500", ring: "ring-emerald-500/50", icon: "🌳" },
  LIXEIRA:        { color: "bg-zinc-500",    ring: "ring-zinc-500/50",    icon: "🗑️" },
  BURACO:         { color: "bg-amber-600",   ring: "ring-amber-600/50",   icon: "🚧" },
};

export function MapCanvas() {
  const { 
    features, drawMode, viewState, setViewState, 
    addDraftPoint, finishDraft, layers, mapStyle 
  } = useMapStore();

  const handleMapClick = (e: any) => {
    if (drawMode === "SELECT") return;
    addDraftPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    if (drawMode === "line" || drawMode === "polygon") {
      finishDraft();
    }
  };

  // Separa o que é Ponto/Ícone (Marker HTML) do que é Geometria (Linha/Polígono WebGL)
  const assetFeatures = features.filter(f => f.type !== "line" && f.type !== "polygon");
  const geometryFeatures = features.filter(f => f.type === "line" || f.type === "polygon");

  // Converte as suas geometrias antigas de volta para GeoJSON nativo do Mapbox
  const geoJsonData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: geometryFeatures.map(f => ({
        type: "Feature",
        geometry: {
          type: f.type === "line" ? "LineString" : "Polygon",
          coordinates: f.type === "line" 
            ? f.coords.map(c => [c.lng, c.lat]) 
            : [f.coords.map(c => [c.lng, c.lat])]
        },
        properties: { id: f.id, color: f.color || "#3468f6" }
      }))
    };
  }, [geometryFeatures]);

  // Captura o estilo do mapa correto
  const mapboxStyleUrl = mapStyle === "streets" ? "mapbox://styles/mapbox/streets-v12" 
                       : mapStyle === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12"
                       : "mapbox://styles/mapbox/dark-v11";

  return (
    <div className="h-full w-full relative bg-[#0a0f1e]" onContextMenu={handleContextMenu}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={mapboxStyleUrl}
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        cursor={drawMode !== "SELECT" ? "crosshair" : "grab"}
      >
        <NavigationControl position="bottom-right" />

        {/* 1. RENDERIZA LINHAS E POLÍGONOS (O seu código antigo brilhando no WebGL) */}
        {layers.obras && (
          <Source id="geometries" type="geojson" data={geoJsonData as any}>
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

        {/* 2. RENDERIZA ATIVOS B2G ANIMADOS (A nova UI) */}
        {layers.ativos && assetFeatures.map((feature) => {
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
                  {!feature.synced && (
                    <span className="ml-2 flex items-center gap-1 text-warning-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning-500 animate-pulse" />
                      Pendente
                    </span>
                  )}
                </div>

                <div className="relative flex h-8 w-8 items-center justify-center">
                  {!feature.synced && (
                    <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", style.color)} />
                  )}
                  <div className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-125",
                    style.color,
                    !feature.synced && `ring-4 ${style.ring}`
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
      
      {/* Dicas flutuantes para a operação do mouse */}
      {drawMode !== "SELECT" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-brand-400 bg-brand-600/90 backdrop-blur-md px-6 py-2.5 text-sm font-bold text-white shadow-2xl animate-bounce flex items-center gap-2">
          {drawMode === "line" || drawMode === "polygon" ? (
            <>Clique para adicionar vértices. <kbd className="bg-white/20 px-1 rounded">Botão Direito</kbd> finaliza.</>
          ) : (
            <>Clique no mapa para fixar: {drawMode.replace("_", " ")}</>
          )}
        </div>
      )}
    </div>
  );
}