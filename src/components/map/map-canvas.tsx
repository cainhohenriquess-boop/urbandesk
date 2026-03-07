"use client";

import { useCallback, useRef, useState } from "react";
import Map, {
  NavigationControl,
  GeolocateControl,
  Marker,
  Popup,
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
} from "react-map-gl";
import type { LayerProps } from "react-map-gl";
import {
  useMapStore,
  selectDrawMode,
  selectFeatures,
  selectLayers,
  selectSelectedFeature,
  type GeoPoint,
  type DrawnFeature,
} from "@/store/useMapStore";
import { cn, formatCoords } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ─────────────────────────────────────────────
// Layer styles
// ─────────────────────────────────────────────
const DRAFT_LINE: LayerProps = {
  id: "draft-line", type: "line",
  paint: { "line-color":"#3468f6", "line-width":2, "line-dasharray":[3,2], "line-opacity":0.8 },
};
const DRAFT_FILL: LayerProps = {
  id: "draft-fill", type: "fill",
  paint: { "fill-color":"#3468f6", "fill-opacity":0.08 },
};
const FEAT_LINE: LayerProps = {
  id: "feat-line", type: "line",
  paint: { "line-color":["coalesce",["get","color"],"#3468f6"], "line-width":2.5 },
};
const FEAT_FILL: LayerProps = {
  id: "feat-fill", type: "fill",
  paint: { "fill-color":["coalesce",["get","color"],"#3468f6"], "fill-opacity":0.12 },
};
const FEAT_POLY_BORDER: LayerProps = {
  id: "feat-poly-border", type: "line",
  paint: { "line-color":["coalesce",["get","color"],"#3468f6"], "line-width":2 },
};
const EXT_CIRCLE: LayerProps = {
  id: "ext-points", type: "circle",
  paint: { "circle-radius":6, "circle-color":"#3468f6", "circle-stroke-color":"#fff", "circle-stroke-width":1.5 },
};

// ─────────────────────────────────────────────
// GeoJSON builders
// ─────────────────────────────────────────────
function featsToGeoJSON(feats: DrawnFeature[]) {
  return {
    type: "FeatureCollection" as const,
    features: feats.map((f) => {
      const coords = f.coords.map(({ lat, lng }) => [lng, lat]);
      const geom =
        f.type === "point"   ? { type:"Point"      as const, coordinates: coords[0] } :
        f.type === "line"    ? { type:"LineString"  as const, coordinates: coords } :
                               { type:"Polygon"     as const, coordinates: [[...coords, coords[0]]] };
      return { type:"Feature" as const, properties:{ id:f.id, label:f.label??"", color:f.color??"#3468f6" }, geometry:geom };
    }),
  };
}

function draftToGeoJSON(pts: GeoPoint[], mode: string) {
  if (pts.length < 1) return null;
  const coords = pts.map(({ lat, lng }) => [lng, lat]);
  const geom =
    mode === "line"    ? { type:"LineString" as const, coordinates: coords } :
    mode === "polygon" ? { type:"Polygon"    as const, coordinates: [[...coords, coords[0]]] } :
    null;
  if (!geom) return null;
  return { type:"FeatureCollection" as const, features:[{ type:"Feature" as const, properties:{}, geometry:geom }] };
}

// ─────────────────────────────────────────────
// Popup
// ─────────────────────────────────────────────
function FeatPopup({ feat, onClose, onDelete }: { feat: DrawnFeature; onClose:()=>void; onDelete:()=>void }) {
  const coord = feat.coords[0];
  if (!coord) return null;
  return (
    <Popup longitude={coord.lng} latitude={coord.lat} anchor="bottom" offset={28} closeButton={false} onClose={onClose}>
      <div className="min-w-[176px] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-foreground leading-tight">
            {feat.label || (feat.type==="point"?"Ponto":feat.type==="line"?"Linha":"Polígono")}
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>
        </div>
        <p className="geo-label">{formatCoords(coord.lat, coord.lng)}</p>
        <div className="flex gap-1.5">
          <button className="flex-1 rounded-md bg-brand-600 py-1 text-[10px] font-medium text-white hover:bg-brand-500 transition-colors">Editar</button>
          <button onClick={onDelete} className="rounded-md border border-danger-200 bg-danger-50 px-2 text-[10px] text-danger-600 hover:bg-danger-100 transition-colors">🗑</button>
        </div>
      </div>
    </Popup>
  );
}

// ─────────────────────────────────────────────
// MapCanvas
// ─────────────────────────────────────────────
export interface MapCanvasProps {
  className?:       string;
  externalGeoJSON?: any;
}

export function MapCanvas({ className, externalGeoJSON }: MapCanvasProps) {
  const mapRef = useRef<MapRef>(null);

  const drawMode        = useMapStore(selectDrawMode);
  const features        = useMapStore(selectFeatures);
  const layers          = useMapStore(selectLayers);
  const selectedFeature = useMapStore(selectSelectedFeature);
  const draftPoints     = useMapStore((s) => s.draftPoints);
  const mapStyle        = useMapStore((s) => s.mapStyle);
  const viewState       = useMapStore((s) => s.viewState);

  const setViewState  = useMapStore((s) => s.setViewState);
  const addDraftPoint = useMapStore((s) => s.addDraftPoint);
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const removeFeature = useMapStore((s) => s.removeFeature);
  const addFeature    = useMapStore((s) => s.addFeature);
  const clearDraft    = useMapStore((s) => s.clearDraftPoints);
  const setDrawMode   = useMapStore((s) => s.setDrawMode);

  const [hoverCoords, setHoverCoords] = useState<{ lat:number; lng:number }|null>(null);

  const styleUrl = {
    streets:    "mapbox://styles/mapbox/light-v11",
    satellite:  "mapbox://styles/mapbox/satellite-streets-v12",
    topography: "mapbox://styles/mapbox/outdoors-v12",
  }[mapStyle];

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;
    if (drawMode === "none") { setSelectedId(null); return; }
    if (drawMode === "point") { addFeature({ type:"point", coords:[{ lat, lng }] }); return; }
    addDraftPoint({ lat, lng });
  }, [drawMode, addFeature, addDraftPoint, setSelectedId]);

  const handleDblClick = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    if ((drawMode === "line" || drawMode === "polygon") && draftPoints.length >= 2) {
      addFeature({ type: drawMode, coords: draftPoints });
      clearDraft();
      setDrawMode("none");
    }
  }, [drawMode, draftPoints, addFeature, clearDraft, setDrawMode]);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    setHoverCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
  }, []);

  const pointFeats   = features.filter((f) => f.type === "point");
  const lineFeats    = features.filter((f) => f.type === "line");
  const polygonFeats = features.filter((f) => f.type === "polygon");
  const lineGeoJSON  = featsToGeoJSON(lineFeats);
  const polyGeoJSON  = featsToGeoJSON(polygonFeats);
  const draftGeoJSON = draftToGeoJSON(draftPoints, drawMode);

  return (
    <div className={cn("map-canvas", className)}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e: ViewStateChangeEvent) => setViewState(e.viewState as any)}
        onClick={handleClick}
        onDblClick={handleDblClick}
        onMouseMove={handleMouseMove}
        style={{ width:"100%", height:"100%" }}
        mapStyle={styleUrl}
        mapboxAccessToken={MAPBOX_TOKEN}
        cursor={drawMode !== "none" ? "crosshair" : "grab"}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <GeolocateControl  position="bottom-right" trackUserLocation showAccuracyCircle />

        {/* Assets externos do banco */}
        {externalGeoJSON && layers.ativos && (
          <Source id="ext" type="geojson" data={externalGeoJSON}>
            <Layer {...EXT_CIRCLE} />
          </Source>
        )}

        {/* Linhas salvas */}
        {lineGeoJSON.features.length > 0 && (
          <Source id="lines" type="geojson" data={lineGeoJSON}>
            <Layer {...FEAT_LINE} />
          </Source>
        )}

        {/* Polígonos salvos */}
        {polyGeoJSON.features.length > 0 && (
          <Source id="polys" type="geojson" data={polyGeoJSON}>
            <Layer {...FEAT_FILL} />
            <Layer {...FEAT_POLY_BORDER} />
          </Source>
        )}

        {/* Draft */}
        {draftGeoJSON && (
          <Source id="draft" type="geojson" data={draftGeoJSON}>
            <Layer {...DRAFT_LINE} />
            {drawMode === "polygon" && <Layer {...DRAFT_FILL} />}
          </Source>
        )}

        {/* Marcadores de pontos */}
        {layers.ativos && pointFeats.map((f) => {
          const pt = f.coords[0];
          if (!pt) return null;
          return (
            <Marker key={f.id} longitude={pt.lng} latitude={pt.lat} anchor="center">
              <button
                onClick={() => setSelectedId(f.id)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-white text-xs shadow-map ring-2 transition-all hover:scale-110",
                  selectedFeature?.id === f.id
                    ? "bg-brand-600 ring-brand-300 scale-110"
                    : "bg-brand-700 ring-white/60"
                )}
              >📍</button>
            </Marker>
          );
        })}

        {/* Pontos draft */}
        {draftPoints.map((pt, i) => (
          <Marker key={`dp-${i}`} longitude={pt.lng} latitude={pt.lat} anchor="center">
            <div className="h-3 w-3 rounded-full border-2 border-brand-500 bg-white shadow-sm" />
          </Marker>
        ))}

        {/* Popup selecionado */}
        {selectedFeature && (
          <FeatPopup
            feat={selectedFeature}
            onClose={() => setSelectedId(null)}
            onDelete={() => { removeFeature(selectedFeature.id); setSelectedId(null); }}
          />
        )}
      </Map>

      {/* Coordenadas */}
      {hoverCoords && (
        <div className="absolute bottom-3 left-3 z-toolbar pointer-events-none">
          <p className="geo-label rounded-md bg-card/85 px-2.5 py-1 shadow-sm backdrop-blur-sm">
            {formatCoords(hoverCoords.lat, hoverCoords.lng)}
          </p>
        </div>
      )}

      {/* Instrução fechamento */}
      {(drawMode === "line" || drawMode === "polygon") && draftPoints.length >= 2 && (
        <div className="absolute bottom-12 left-1/2 z-toolbar -translate-x-1/2 pointer-events-none animate-fade-in">
          <p className="rounded-full border border-brand-200 bg-brand-50/90 px-4 py-1.5 text-xs font-medium text-brand-700 shadow-sm backdrop-blur-sm">
            Clique duplo para finalizar o {drawMode === "line" ? "trecho" : "polígono"}
          </p>
        </div>
      )}
    </div>
  );
}
