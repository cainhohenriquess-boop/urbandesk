"use client";

import React, { useEffect, useMemo, useState } from "react";
import Map, {
  Layer,
  MapLayerMouseEvent,
  Marker,
  MarkerDragEvent,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/useMapStore";

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: Array<Record<string, unknown>>;
};

const GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

const BLANK_STYLE = {
  version: 8,
  name: "Base Cartográfica",
  glyphs: GLYPHS_URL,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#ffffff" } }],
};

const SATELLITE_STYLE = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
  },
  layers: [{ id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19 }],
};

const TOPO_STYLE = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    topo: {
      type: "raster",
      tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenTopoMap",
    },
  },
  layers: [{ id: "topo-layer", type: "raster", source: "topo", minzoom: 0, maxzoom: 17 }],
};

const ASSET_STYLES = {
  BOCA_LOBO: { color: "bg-blue-500", hex: "#3b82f6", ring: "ring-blue-500/50", icon: "💧", label: "Boca de Lobo" },
  POCO_VISITA: { color: "bg-slate-600", hex: "#475569", ring: "ring-slate-600/50", icon: "🕳️", label: "Poço de Visita" },
  HIDRANTE: { color: "bg-red-500", hex: "#ef4444", ring: "ring-red-500/50", icon: "🚒", label: "Hidrante" },
  SEMAFORO: { color: "bg-amber-500", hex: "#f59e0b", ring: "ring-amber-500/50", icon: "🚦", label: "Semáforo" },
  PLACA_TRANSITO: { color: "bg-red-600", hex: "#dc2626", ring: "ring-red-600/50", icon: "🛑", label: "Placa" },
  LOMBADA: { color: "bg-orange-500", hex: "#f97316", ring: "ring-orange-500/50", icon: "〰️", label: "Lombada" },
  PONTO_ONIBUS: { color: "bg-cyan-500", hex: "#06b6d4", ring: "ring-cyan-500/50", icon: "🚏", label: "Ponto de Ônibus" },
  RADAR: { color: "bg-slate-700", hex: "#334155", ring: "ring-slate-700/50", icon: "📸", label: "Radar" },
  POSTE_LUZ: { color: "bg-yellow-400", hex: "#facc15", ring: "ring-yellow-400/50", icon: "💡", label: "Poste" },
  ARVORE: { color: "bg-emerald-500", hex: "#10b981", ring: "ring-emerald-500/50", icon: "🌳", label: "Árvore" },
  LIXEIRA: { color: "bg-zinc-500", hex: "#71717a", ring: "ring-zinc-500/50", icon: "🗑️", label: "Lixeira" },
  BURACO: { color: "bg-amber-600", hex: "#d97706", ring: "ring-amber-600/50", icon: "🚧", label: "Buraco" },
};

function hasValidPoint(coords: { lng: number; lat: number }[] | undefined): boolean {
  if (!coords || coords.length === 0) return false;
  return Number.isFinite(coords[0]?.lng) && Number.isFinite(coords[0]?.lat);
}

function parseBaseLayerGeoJson(raw: unknown): GeoJsonFeatureCollection {
  try {
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) parsed = parsed[0];

    if (parsed && typeof parsed === "object" && (parsed as { type?: string }).type === "FeatureCollection") {
      const features = Array.isArray((parsed as { features?: unknown }).features)
        ? ((parsed as { features: unknown[] }).features as Array<Record<string, unknown>>)
        : [];
      return { type: "FeatureCollection", features };
    }
  } catch (error) {
    console.error("GeoJSON de baselayer inválido", error);
  }

  return { type: "FeatureCollection", features: [] };
}

function detectPotentialUtm(collections: GeoJsonFeatureCollection[]): boolean {
  const scanCoords = (coords: unknown): boolean => {
    if (!Array.isArray(coords) || coords.length === 0) return false;

    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      return Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90;
    }

    for (const item of coords) {
      if (scanCoords(item)) return true;
    }

    return false;
  };

  for (const collection of collections) {
    for (const feature of collection.features) {
      const geometry = (feature as { geometry?: { coordinates?: unknown } }).geometry;
      if (geometry?.coordinates && scanCoords(geometry.coordinates)) {
        return true;
      }
    }
  }

  return false;
}

function EngineeringPanel() {
  const { pendingFeature, cancelPendingFeature, confirmPendingFeature } = useMapStore();
  const [formData, setFormData] = useState({
    nome: "",
    status: "PROJETADO",
    custoEstimado: "",
    material: "CONCRETO",
    observacoes: "",
  });

  if (!pendingFeature) return null;

  const isGeometry = pendingFeature.type === "line" || pendingFeature.type === "polygon";
  const title = isGeometry
    ? pendingFeature.type === "line"
      ? "Nova Rede/Trecho"
      : "Nova Área/Lote"
    : ASSET_STYLES[pendingFeature.type as keyof typeof ASSET_STYLES]?.label || pendingFeature.type;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    confirmPendingFeature(
      {
        status: formData.status,
        custo: formData.custoEstimado ? Number(formData.custoEstimado) : 0,
        material: formData.material,
        obs: formData.observacoes,
      },
      formData.nome
    );
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-50 flex flex-col animate-slide-left">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded">Modo Projeto</span>
          <button onClick={cancelPendingFeature} className="text-muted-foreground hover:text-danger-500">×</button>
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase">Nome</label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData((s) => ({ ...s, nome: e.target.value }))}
            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:border-brand-500"
          />
        </div>

        <div className="pt-4 flex gap-2">
          <button type="button" onClick={cancelPendingFeature} className="flex-1 py-2 rounded-md bg-muted font-medium">Cancelar</button>
          <button type="submit" className="flex-1 py-2 rounded-md bg-brand-600 text-white font-bold">Salvar Projeto</button>
        </div>
      </form>
    </div>
  );
}

type MapCanvasProps = {
  className?: string;
  showEngineeringPanel?: boolean;
  showSelectionOverlay?: boolean;
  showFullscreenButton?: boolean;
  showDrawHint?: boolean;
};

export function MapCanvas(props: MapCanvasProps) {
  return <MapCanvasInner {...props} />;
}

function MapCanvasInner({
  className,
  showEngineeringPanel = true,
  showSelectionOverlay = true,
  showFullscreenButton = true,
  showDrawHint = true,
}: MapCanvasProps = {}) {
  const {
    features,
    drawMode,
    viewState,
    setViewState,
    addDraftPoint,
    draftPoints,
    finishDraft,
    layers,
    mapStyle,
    isFullscreen,
    toggleFullscreen,
    baseLayersData,
    selectedId,
    setSelectedId,
    updateFeature,
    removeFeature,
  } = useMapStore();

  const [utmWarning, setUtmWarning] = useState(false);

  const baseLayersSafe = useMemo(() => {
    return baseLayersData.map((layer) => ({
      id: layer.id,
      type: layer.type,
      data: parseBaseLayerGeoJson(layer.geoJsonData),
    }));
  }, [baseLayersData]);

  useEffect(() => {
    setUtmWarning(detectPotentialUtm(baseLayersSafe.map((layer) => layer.data)));
  }, [baseLayersSafe]);

  const geometryFeatures = useMemo(() => {
    return features.filter((feature) => {
      if (feature.type !== "line" && feature.type !== "polygon") return false;
      if (!feature.coords || feature.coords.length < 2) return false;
      return feature.coords.every((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat));
    });
  }, [features]);

  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedId) ?? null,
    [features, selectedId]
  );

  const selectedGeometry =
    selectedFeature && (selectedFeature.type === "line" || selectedFeature.type === "polygon")
      ? selectedFeature
      : null;

  const assetFeatures = useMemo(
    () => features.filter((feature) => feature.type !== "line" && feature.type !== "polygon"),
    [features]
  );

  const syncedAssets = useMemo(() => assetFeatures.filter((feature) => feature.synced), [assetFeatures]);
  const unsyncedAssets = useMemo(() => assetFeatures.filter((feature) => !feature.synced), [assetFeatures]);

  const activeMapStyle =
    mapStyle === "topography" ? TOPO_STYLE : mapStyle === "satellite" ? SATELLITE_STYLE : BLANK_STYLE;

  const handleMapClick = (event: MapLayerMouseEvent) => {
    if (drawMode === "SELECT") {
      const clicked = event.features?.find((feature) => {
        const id = (feature.properties as { id?: unknown } | undefined)?.id;
        return typeof id === "string";
      });

      const selected = (clicked?.properties as { id?: string } | undefined)?.id ?? null;
      setSelectedId(selected);
      return;
    }

    addDraftPoint({ lng: event.lngLat.lng, lat: event.lngLat.lat });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (drawMode === "line" || drawMode === "polygon") {
      finishDraft();
    }
  };

  const handleVertexDrag = (vertexIndex: number) => (event: MarkerDragEvent) => {
    if (!selectedGeometry) return;

    const nextCoords = selectedGeometry.coords.map((coord, idx) =>
      idx === vertexIndex ? { lng: event.lngLat.lng, lat: event.lngLat.lat } : coord
    );

    updateFeature(selectedGeometry.id, { coords: nextCoords, synced: false });
  };

  const geometriesGeoJson = useMemo<GeoJsonFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: geometryFeatures.map((feature) => {
        const coords = feature.coords.map((coord) => [coord.lng, coord.lat]);

        if (feature.type === "polygon" && coords.length > 2) {
          coords.push([feature.coords[0].lng, feature.coords[0].lat]);
        }

        return {
          type: "Feature",
          geometry: {
            type: feature.type === "line" ? "LineString" : "Polygon",
            coordinates: feature.type === "line" ? coords : [coords],
          },
          properties: {
            id: feature.id,
            color: feature.color || "#3b82f6",
            selected: feature.id === selectedId,
          },
        };
      }),
    };
  }, [geometryFeatures, selectedId]);

  const selectedGeometryGeoJson = useMemo<GeoJsonFeatureCollection | null>(() => {
    if (!selectedGeometry) return null;

    const coords = selectedGeometry.coords.map((coord) => [coord.lng, coord.lat]);

    if (selectedGeometry.type === "polygon" && coords.length > 2) {
      coords.push([selectedGeometry.coords[0].lng, selectedGeometry.coords[0].lat]);
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: selectedGeometry.type === "line" ? "LineString" : "Polygon",
            coordinates: selectedGeometry.type === "line" ? coords : [coords],
          },
          properties: { id: selectedGeometry.id },
        },
      ],
    };
  }, [selectedGeometry]);

  const draftGeoJson = useMemo<GeoJsonFeatureCollection | null>(() => {
    if (draftPoints.length === 0 || (drawMode !== "line" && drawMode !== "polygon")) return null;

    const coords = draftPoints.map((point) => [point.lng, point.lat]);
    const featuresDraft: Array<Record<string, unknown>> = [];

    coords.forEach((coord) => {
      featuresDraft.push({ type: "Feature", geometry: { type: "Point", coordinates: coord } });
    });

    if (coords.length > 1) {
      if (drawMode === "polygon" && coords.length > 2) {
        featuresDraft.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[...coords, coords[0]]] },
        });
      } else {
        featuresDraft.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    }

    return { type: "FeatureCollection", features: featuresDraft };
  }, [draftPoints, drawMode]);

  const syncedAssetsGeoJson = useMemo<GeoJsonFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: syncedAssets
        .filter((feature) => hasValidPoint(feature.coords))
        .map((feature) => {
          const style = ASSET_STYLES[feature.type as keyof typeof ASSET_STYLES];

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [feature.coords[0].lng, feature.coords[0].lat],
            },
            properties: {
              id: feature.id,
              type: feature.type,
              icon: style?.icon || "📍",
              color: style?.hex || "#ffffff",
            },
          };
        }),
    };
  }, [syncedAssets]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-[#ffffff]", className)}
      onContextMenu={handleContextMenu}
    >
      {showEngineeringPanel ? <EngineeringPanel /> : null}

      {utmWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-danger-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <p className="text-sm font-bold">Coordenadas possivelmente em UTM. Recomenda-se EPSG:4326.</p>
        </div>
      )}

      {showSelectionOverlay && selectedFeature && (
        <div className="absolute top-4 left-4 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-xl w-72">
          <p className="text-xs font-bold text-foreground">Selecionado: {selectedFeature.label || selectedFeature.type}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {selectedGeometry ? "Arraste os vértices para editar geometria." : "Ativo de ponto selecionado."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setSelectedId(null)}
              className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                removeFeature(selectedFeature.id);
                setSelectedId(null);
              }}
              className="flex-1 rounded-md bg-danger-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-danger-700"
            >
              Remover
            </button>
          </div>
        </div>
      )}

      {showFullscreenButton ? (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-14 z-40 rounded-lg border border-border bg-card/90 p-2 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-muted"
        >
          {isFullscreen ? "⤢" : "⤢"}
        </button>
      ) : null}

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={activeMapStyle as any}
        onClick={handleMapClick}
        interactiveLayerIds={["geom-lines", "geom-polygons-fill", "assets-circle"]}
        cursor={drawMode !== "SELECT" ? "crosshair" : "grab"}
      >
        <NavigationControl position="bottom-right" />

        {layers.basegis &&
          baseLayersSafe.map((layer) => {
            const sourceId = `base-source-${layer.id}`;

            return (
              <React.Fragment key={layer.id}>
                <Source id={sourceId} type="geojson" data={layer.data as any} />

                {layer.type === "BOUNDARY" && (
                  <>
                    <Layer
                      source={sourceId}
                      id={`base-fill-${layer.id}`}
                      type="fill"
                      paint={{ "fill-color": "#0ea5e9", "fill-opacity": 0.05 }}
                      filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                    />
                    <Layer
                      source={sourceId}
                      id={`base-line-${layer.id}`}
                      type="line"
                      paint={{ "line-color": "#0ea5e9", "line-width": 2, "line-dasharray": [2, 3] }}
                      filter={[
                        "in",
                        ["geometry-type"],
                        ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]],
                      ]}
                    />
                  </>
                )}

                {layer.type === "STREETS" && (
                  <>
                    <Layer
                      source={sourceId}
                      id={`base-street-fill-${layer.id}`}
                      type="fill"
                      paint={{ "fill-color": "#e2e8f0", "fill-opacity": 0.5 }}
                      filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                    />
                    <Layer
                      source={sourceId}
                      id={`base-street-line-${layer.id}`}
                      type="line"
                      paint={{ "line-color": "#64748b", "line-width": 1.25 }}
                      filter={[
                        "in",
                        ["geometry-type"],
                        ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]],
                      ]}
                    />
                  </>
                )}

                {layer.type === "STREET_NAMES" && (
                  <Layer
                    source={sourceId}
                    id={`base-street-text-${layer.id}`}
                    type="symbol"
                    filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]}
                    layout={{
                      "text-field": [
                        "coalesce",
                        ["get", "name"],
                        ["get", "NAME"],
                        ["get", "NOME"],
                        ["get", "Rua"],
                        ["get", "VIA"],
                      ],
                      "text-size": 12,
                      "symbol-placement": "line-center",
                    }}
                    paint={{ "text-color": "#1e293b", "text-halo-color": "#ffffff", "text-halo-width": 1.8 }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {draftGeoJson && (
          <Source id="draft-source" type="geojson" data={draftGeoJson as any}>
            <Layer id="draft-polygon-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": "#10b981", "fill-opacity": 0.28 }} />
            <Layer id="draft-line" type="line" filter={["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]]} paint={{ "line-color": "#10b981", "line-width": 3, "line-dasharray": [2, 2] }} />
            <Layer id="draft-points" type="circle" filter={["==", ["geometry-type"], "Point"]} paint={{ "circle-color": "#ffffff", "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": "#10b981" }} />
          </Source>
        )}

        {layers.obras && (
          <Source id="geometries" type="geojson" data={geometriesGeoJson as any}>
            <Layer id="geom-lines" type="line" filter={["==", ["geometry-type"], "LineString"]} paint={{ "line-color": ["get", "color"], "line-width": 4 }} />
            <Layer id="geom-polygons-fill" type="fill" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.26 }} />
            <Layer id="geom-polygons-stroke" type="line" filter={["==", ["geometry-type"], "Polygon"]} paint={{ "line-color": ["get", "color"], "line-width": 2 }} />
          </Source>
        )}

        {selectedGeometryGeoJson && (
          <Source id="selected-geometry" type="geojson" data={selectedGeometryGeoJson as any}>
            <Layer id="selected-geometry-line" type="line" paint={{ "line-color": "#f43f5e", "line-width": 5 }} />
            <Layer id="selected-geometry-fill" type="fill" paint={{ "fill-color": "#f43f5e", "fill-opacity": 0.12 }} />
          </Source>
        )}

        {layers.ativos && (
          <Source id="synced-assets" type="geojson" data={syncedAssetsGeoJson as any}>
            <Layer id="assets-circle" type="circle" paint={{ "circle-color": ["get", "color"], "circle-radius": 13, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" }} />
            <Layer id="assets-symbol" type="symbol" layout={{ "text-field": ["get", "icon"], "text-size": 14, "text-allow-overlap": true }} />
          </Source>
        )}

        {layers.ativos &&
          unsyncedAssets.map((feature) => {
            const style = ASSET_STYLES[feature.type as keyof typeof ASSET_STYLES];
            if (!style || !hasValidPoint(feature.coords)) return null;

            return (
              <Marker key={feature.id} longitude={feature.coords[0].lng} latitude={feature.coords[0].lat} anchor="bottom">
                <button
                  onClick={() => setSelectedId(feature.id)}
                  className="relative group flex flex-col items-center cursor-pointer"
                >
                  <div className="absolute -top-12 hidden group-hover:flex items-center whitespace-nowrap rounded-lg bg-card px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-xl border border-border flex-col z-50">
                    <span>{feature.label || style.label}</span>
                    <span className="text-warning-500 text-[9px] mt-0.5">Pendente no BD</span>
                  </div>

                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", style.color)} />
                    <div className={cn("relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-125 ring-4", style.color, style.ring)}>{style.icon}</div>
                  </div>
                  <div className="h-3 w-[2px] bg-white/90 shadow-sm rounded-b-full" />
                </button>
              </Marker>
            );
          })}

        {selectedGeometry?.coords.map((point, index) => (
          <Marker
            key={`${selectedGeometry.id}-vertex-${index}`}
            longitude={point.lng}
            latitude={point.lat}
            draggable
            onDragEnd={handleVertexDrag(index)}
            anchor="center"
          >
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-danger-500 shadow-lg" />
          </Marker>
        ))}
      </Map>

      {showDrawHint && drawMode !== "SELECT" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-brand-400 bg-brand-600/90 backdrop-blur-md px-6 py-2.5 text-sm font-bold text-white shadow-2xl flex items-center gap-2 pointer-events-none z-40">
          {drawMode === "line" || drawMode === "polygon"
            ? "Clique para adicionar vértices. Botão direito finaliza."
            : `Clique no mapa para projetar: ${ASSET_STYLES[drawMode as keyof typeof ASSET_STYLES]?.label}`}
        </div>
      )}
    </div>
  );
}
