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
import {
  featureAnchor,
  findSpatialMatches,
  snapToNearestVertex,
  splitLineFeature,
  translateFeature,
} from "@/lib/map-workspace-tools";
import { readDrainageSegmentFieldValue } from "@/lib/drainage-segment";
import { getTechnicalObjectLabel } from "@/lib/project-disciplines";
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
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
  },
  layers: [
    { id: "satellite-layer", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19 },
  ],
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
  BOCA_LOBO: {
    color: "bg-blue-500",
    hex: "#3b82f6",
    ring: "ring-blue-500/50",
    icon: "💧",
    label: "Boca de Lobo",
  },
  POCO_VISITA: {
    color: "bg-slate-600",
    hex: "#475569",
    ring: "ring-slate-600/50",
    icon: "PV",
    label: "Poço de Visita",
  },
  CAIXA_LIGACAO: {
    color: "bg-indigo-500",
    hex: "#6366f1",
    ring: "ring-indigo-500/50",
    icon: "CL",
    label: "Caixa de Ligação",
  },
  DISSIPADOR: {
    color: "bg-teal-500",
    hex: "#14b8a6",
    ring: "ring-teal-500/50",
    icon: "DS",
    label: "Dissipador",
  },
  PONTO_ALAGAMENTO: {
    color: "bg-sky-600",
    hex: "#0284c7",
    ring: "ring-sky-600/50",
    icon: "AL",
    label: "Ponto de Alagamento",
  },
  OCORRENCIA_DRENAGEM: {
    color: "bg-cyan-700",
    hex: "#0e7490",
    ring: "ring-cyan-700/50",
    icon: "MT",
    label: "Ocorrência",
  },
  HIDRANTE: {
    color: "bg-red-500",
    hex: "#ef4444",
    ring: "ring-red-500/50",
    icon: "🚒",
    label: "Hidrante",
  },
  SEMAFORO: {
    color: "bg-amber-500",
    hex: "#f59e0b",
    ring: "ring-amber-500/50",
    icon: "🚦",
    label: "Semáforo",
  },
  PLACA_TRANSITO: {
    color: "bg-red-600",
    hex: "#dc2626",
    ring: "ring-red-600/50",
    icon: "🛑",
    label: "Placa",
  },
  LOMBADA: {
    color: "bg-orange-500",
    hex: "#f97316",
    ring: "ring-orange-500/50",
    icon: "〰️",
    label: "Lombada",
  },
  PONTO_ONIBUS: {
    color: "bg-cyan-500",
    hex: "#06b6d4",
    ring: "ring-cyan-500/50",
    icon: "🚏",
    label: "Ponto de Ônibus",
  },
  RADAR: {
    color: "bg-slate-700",
    hex: "#334155",
    ring: "ring-slate-700/50",
    icon: "📸",
    label: "Radar",
  },
  POSTE_LUZ: {
    color: "bg-yellow-400",
    hex: "#facc15",
    ring: "ring-yellow-400/50",
    icon: "💡",
    label: "Poste",
  },
  ARVORE: {
    color: "bg-emerald-500",
    hex: "#10b981",
    ring: "ring-emerald-500/50",
    icon: "🌳",
    label: "Árvore",
  },
  LIXEIRA: {
    color: "bg-zinc-500",
    hex: "#71717a",
    ring: "ring-zinc-500/50",
    icon: "🗑️",
    label: "Lixeira",
  },
  BURACO: {
    color: "bg-amber-600",
    hex: "#d97706",
    ring: "ring-amber-600/50",
    icon: "BK",
    label: "Buraco",
  },
  DEFEITO_PAVIMENTO: {
    color: "bg-orange-500",
    hex: "#f97316",
    ring: "ring-orange-500/50",
    icon: "DP",
    label: "Defeito",
  },
  AFUNDAMENTO_VIARIO: {
    color: "bg-red-500",
    hex: "#ef4444",
    ring: "ring-red-500/50",
    icon: "AF",
    label: "Afundamento",
  },
  LUMINARIA: {
    color: "bg-yellow-500",
    hex: "#eab308",
    ring: "ring-yellow-500/50",
    icon: "*",
    label: "Lumin?ria",
  },
  PONTO_FISCALIZACAO: {
    color: "bg-violet-500",
    hex: "#8b5cf6",
    ring: "ring-violet-500/50",
    icon: "!",
    label: "Ponto de fiscaliza??o",
  },
  EQUIPAMENTO_OBRA: {
    color: "bg-stone-500",
    hex: "#78716c",
    ring: "ring-stone-500/50",
    icon: "#",
    label: "Equipamento de obra",
  },
} as const;

function readFeatureString(attributes: Record<string, unknown> | undefined, key: string) {
  return readDrainageSegmentFieldValue(attributes ?? {}, key);
}

function getDrainageLineStyle(feature: { attributes?: Record<string, unknown>; color?: string }) {
  const technicalObjectType =
    readFeatureString(feature.attributes, "technicalObjectType") ??
    readFeatureString(feature.attributes, "subType");
  const operationalStatus = readFeatureString(feature.attributes, "operationalStatus");
  const assetCondition = readFeatureString(feature.attributes, "assetCondition");
  const surfaceCondition = readFeatureString(feature.attributes, "surfaceCondition");
  const riskLevel =
    readFeatureString(feature.attributes, "riskLevel") ??
    readFeatureString(feature.attributes, "criticality");
  const diameterMm = Number(readFeatureString(feature.attributes, "diameterMm") ?? "0");
  const widthMeters = Number(readFeatureString(feature.attributes, "widthMeters") ?? "0");
  const isDrainageLine =
    technicalObjectType === "TRECHO_DRENAGEM" ||
    technicalObjectType === "GALERIA_PLUVIAL" ||
    technicalObjectType === "SARJETA" ||
    technicalObjectType === "CANAL";
  const isPavementLine = technicalObjectType === "TRECHO_PAVIMENTO";
  if (!isDrainageLine && !isPavementLine) {
    return {
      lineColor: feature.color || "#3b82f6",
      lineWidth: 4,
      lineOpacity: 0.94,
    };
  }
  if (isPavementLine) {
    let lineColor = feature.color || "#d97706";
    if (
      riskLevel === "CRITICA" ||
      riskLevel === "CRITICO" ||
      surfaceCondition === "CRITICA" ||
      operationalStatus === "BLOQUEADO"
    ) {
      lineColor = "#dc2626";
    } else if (
      riskLevel === "ALTA" ||
      riskLevel === "ALTO" ||
      surfaceCondition === "RUIM" ||
      operationalStatus === "EM_OBRA"
    ) {
      lineColor = "#f97316";
    } else if (surfaceCondition === "REGULAR" || operationalStatus === "MEIA_PISTA") {
      lineColor = "#f59e0b";
    }
    let lineWidth = 4.5;
    if (Number.isFinite(widthMeters) && widthMeters > 0) {
      if (widthMeters >= 18) lineWidth = 7;
      else if (widthMeters >= 12) lineWidth = 6;
      else if (widthMeters >= 8) lineWidth = 5.25;
    }
    return {
      lineColor,
      lineWidth,
      lineOpacity: operationalStatus === "BLOQUEADO" ? 0.74 : 0.96,
    };
  }
  const baseColor =
    technicalObjectType === "GALERIA_PLUVIAL"
      ? "#2563eb"
      : technicalObjectType === "SARJETA"
        ? "#06b6d4"
        : technicalObjectType === "CANAL"
          ? "#0891b2"
          : "#0284c7";
  let lineColor = feature.color || baseColor;
  if (riskLevel === "CRITICO" || assetCondition === "CRITICA" || operationalStatus === "INTERDITADO") {
    lineColor = "#dc2626";
  } else if (riskLevel === "ALTO" || assetCondition === "RUIM" || operationalStatus === "OBSTRUIDO") {
    lineColor = "#f97316";
  } else if (
    riskLevel === "MODERADO" ||
    assetCondition === "REGULAR" ||
    operationalStatus === "PARCIAL" ||
    operationalStatus === "MANUTENCAO"
  ) {
    lineColor = "#d97706";
  }
  let lineWidth = 4;
  if (Number.isFinite(diameterMm) && diameterMm > 0) {
    if (diameterMm >= 1500) lineWidth = 7;
    else if (diameterMm >= 1000) lineWidth = 6;
    else if (diameterMm >= 800) lineWidth = 5.25;
    else if (diameterMm >= 600) lineWidth = 4.75;
    else if (diameterMm >= 400) lineWidth = 4.25;
  }
  return {
    lineColor,
    lineWidth,
    lineOpacity: operationalStatus === "INTERDITADO" ? 0.72 : 0.94,
  };
}

function getPointVisualStyle(feature: { type: string; attributes?: Record<string, unknown> }) {
  const baseStyle = ASSET_STYLES[feature.type as keyof typeof ASSET_STYLES];
  const technicalObjectType =
    readFeatureString(feature.attributes, "technicalObjectType") ??
    readFeatureString(feature.attributes, "subType");
  const isDrainagePoint =
    technicalObjectType === "BOCA_LOBO" ||
    technicalObjectType === "POCO_VISITA" ||
    technicalObjectType === "CAIXA_LIGACAO" ||
    technicalObjectType === "DISSIPADOR" ||
    technicalObjectType === "PONTO_ALAGAMENTO" ||
    technicalObjectType === "OCORRENCIA_DRENAGEM";
  const isPavementPoint =
    technicalObjectType === "DEFEITO_PAVIMENTO" ||
    technicalObjectType === "BURACO" ||
    technicalObjectType === "AFUNDAMENTO_VIARIO";
  const assetCondition = readFeatureString(feature.attributes, "assetCondition");
  const operationalStatus = readFeatureString(feature.attributes, "operationalStatus");
  const surfaceCondition = readFeatureString(feature.attributes, "surfaceCondition");
  const riskLevel =
    readFeatureString(feature.attributes, "riskLevel") ??
    readFeatureString(feature.attributes, "criticality") ??
    readFeatureString(feature.attributes, "severity");
  let hex = baseStyle?.hex || "#ffffff";
  if (!isDrainagePoint && !isPavementPoint) {
    return {
      ...(baseStyle ?? {}),
      hex,
    };
  }
  if (
    riskLevel === "CRITICO" ||
    riskLevel === "CRITICA" ||
    assetCondition === "CRITICA" ||
    surfaceCondition === "CRITICA" ||
    operationalStatus === "INTERDITADO" ||
    operationalStatus === "BLOQUEADO"
  ) {
    hex = "#dc2626";
  } else if (
    riskLevel === "ALTO" ||
    riskLevel === "ALTA" ||
    assetCondition === "RUIM" ||
    surfaceCondition === "RUIM" ||
    operationalStatus === "OBSTRUIDO" ||
    operationalStatus === "EM_OBRA"
  ) {
    hex = "#f97316";
  } else if (
    riskLevel === "MODERADO" ||
    riskLevel === "MEDIA" ||
    assetCondition === "REGULAR" ||
    surfaceCondition === "REGULAR" ||
    operationalStatus === "PARCIAL" ||
    operationalStatus === "MEIA_PISTA" ||
    operationalStatus === "MANUTENCAO"
  ) {
    hex = "#d97706";
  }
  return {
    ...(baseStyle ?? {}),
    hex,
  };
}function hasValidPoint(coords: { lng: number; lat: number }[] | undefined): boolean {
  if (!coords || coords.length === 0) return false;
  return Number.isFinite(coords[0]?.lng) && Number.isFinite(coords[0]?.lat);
}

function parseBaseLayerGeoJson(raw: unknown): GeoJsonFeatureCollection {
  try {
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) parsed = parsed[0];

    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: string }).type === "FeatureCollection"
    ) {
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

function createCirclePolygon(center: { lng: number; lat: number }, radiusMeters: number) {
  const earthRadiusMeters = 6378137;
  const latRadians = (center.lat * Math.PI) / 180;
  const latDelta = (radiusMeters / earthRadiusMeters) * (180 / Math.PI);
  const lngDelta =
    ((radiusMeters / earthRadiusMeters) * (180 / Math.PI)) /
    Math.max(Math.cos(latRadians), 0.2);
  const coordinates: number[][] = [];

  for (let step = 0; step <= 48; step += 1) {
    const angle = (step / 48) * Math.PI * 2;
    coordinates.push([
      center.lng + lngDelta * Math.cos(angle),
      center.lat + latDelta * Math.sin(angle),
    ]);
  }

  return coordinates;
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
    <div className="animate-slide-left absolute bottom-0 right-0 top-0 z-50 flex w-80 flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-md">
      <div className="border-b border-border bg-muted/30 p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-500">
            Modo Projeto
          </span>
          <button onClick={cancelPendingFeature} className="text-muted-foreground hover:text-danger-500">
            ×
          </button>
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Nome</label>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData((s) => ({ ...s, nome: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button type="button" onClick={cancelPendingFeature} className="flex-1 rounded-md bg-muted py-2 font-medium">
            Cancelar
          </button>
          <button type="submit" className="flex-1 rounded-md bg-brand-600 py-2 font-bold text-white">
            Salvar Projeto
          </button>
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
  visibleFeatureIds?: string[];
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
  visibleFeatureIds,
}: MapCanvasProps = {}) {
  const {
    features,
    drawMode,
    workspaceTool,
    activeTechnicalObjectType,
    snapEnabled,
    measurementPoints,
    addMeasurementPoint,
    clearMeasurement,
    spatialSearch,
    setSpatialSearchResult,
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
    visibleBaseLayerIds,
    selectedId,
    setSelectedId,
    selectionIds,
    setSelectionIds,
    clearSelectionIds,
    toggleSelectionId,
    updateFeature,
    removeFeature,
    appendFeatures,
  } = useMapStore();

  const [utmWarning, setUtmWarning] = useState(false);
  const visibleIdSet = useMemo(
    () => (Array.isArray(visibleFeatureIds) ? new Set(visibleFeatureIds) : null),
    [visibleFeatureIds]
  );
  const visibleBaseLayerIdSet = useMemo(
    () => new Set(visibleBaseLayerIds),
    [visibleBaseLayerIds]
  );

  const baseLayersSafe = useMemo(() => {
    return baseLayersData.map((layer) => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      data: parseBaseLayerGeoJson(layer.geoJsonData),
    }));
  }, [baseLayersData]);

  useEffect(() => {
    setUtmWarning(detectPotentialUtm(baseLayersSafe.map((layer) => layer.data)));
  }, [baseLayersSafe]);

  const geometryFeatures = useMemo(() => {
    return features.filter((feature) => {
      if (visibleIdSet && !visibleIdSet.has(feature.id)) return false;
      if (feature.type !== "line" && feature.type !== "polygon") return false;
      if (!feature.coords || feature.coords.length < 2) return false;
      return feature.coords.every((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat));
    });
  }, [features, visibleIdSet]);

  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedId) ?? null,
    [features, selectedId]
  );

  const selectedGeometry =
    selectedFeature && (selectedFeature.type === "line" || selectedFeature.type === "polygon")
      ? selectedFeature
      : null;

  const selectedAnchor = useMemo(() => {
    if (!selectedFeature) return null;
    return featureAnchor(selectedFeature);
  }, [selectedFeature]);

  const assetFeatures = useMemo(
    () =>
      features.filter((feature) => {
        if (visibleIdSet && !visibleIdSet.has(feature.id)) return false;
        return feature.type !== "line" && feature.type !== "polygon";
      }),
    [features, visibleIdSet]
  );

  const syncedAssets = useMemo(() => assetFeatures.filter((feature) => feature.synced), [assetFeatures]);
  const unsyncedAssets = useMemo(() => assetFeatures.filter((feature) => !feature.synced), [assetFeatures]);

  const activeMapStyle =
    mapStyle === "topography" ? TOPO_STYLE : mapStyle === "satellite" ? SATELLITE_STYLE : BLANK_STYLE;

  const measurementGeoJson = useMemo<GeoJsonFeatureCollection | null>(() => {
    if (measurementPoints.length === 0) return null;

    const featureCollection: Array<Record<string, unknown>> = measurementPoints.map((point, index) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      properties: { id: `measurement-point-${index}` },
    }));

    if (measurementPoints.length > 1) {
      const coordinates = measurementPoints.map((point) => [point.lng, point.lat]);
      if (workspaceTool === "MEASURE_AREA" && measurementPoints.length > 2) {
        featureCollection.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[...coordinates, coordinates[0]]] },
          properties: { id: "measurement-area" },
        });
      } else {
        featureCollection.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates },
          properties: { id: "measurement-line" },
        });
      }
    }

    return { type: "FeatureCollection", features: featureCollection };
  }, [measurementPoints, workspaceTool]);

  const spatialSearchGeoJson = useMemo<GeoJsonFeatureCollection | null>(() => {
    if (!spatialSearch.center) return null;

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [spatialSearch.center.lng, spatialSearch.center.lat] },
          properties: { id: "spatial-search-center" },
        },
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [createCirclePolygon(spatialSearch.center, spatialSearch.radiusMeters)],
          },
          properties: { id: "spatial-search-radius" },
        },
      ],
    };
  }, [spatialSearch.center, spatialSearch.radiusMeters]);

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const clickedId = event.features?.find((feature) => {
      const id = (feature.properties as { id?: unknown } | undefined)?.id;
      return typeof id === "string";
    })?.properties?.id;

    const clickedFeature =
      typeof clickedId === "string"
        ? features.find((feature) => feature.id === clickedId) ?? null
        : null;

    const rawPoint = { lng: event.lngLat.lng, lat: event.lngLat.lat };
    const snappingPool = clickedFeature
      ? features.filter((feature) => feature.id !== clickedFeature.id)
      : features;
    const snappedPoint = snapToNearestVertex(rawPoint, snappingPool, snapEnabled);

    if (drawMode !== "SELECT") {
      addDraftPoint(snappedPoint);
      return;
    }

    if (workspaceTool === "MEASURE_DISTANCE" || workspaceTool === "MEASURE_AREA") {
      addMeasurementPoint(snappedPoint);
      return;
    }

    if (workspaceTool === "SPATIAL_SEARCH") {
      const resultIds = findSpatialMatches(features, snappedPoint, spatialSearch.radiusMeters);
      setSpatialSearchResult(snappedPoint, resultIds);
      setSelectionIds(resultIds);
      setSelectedId(resultIds[0] ?? null);
      return;
    }

    if (workspaceTool === "SPLIT_TRECHO") {
      const target =
        clickedFeature?.type === "line"
          ? clickedFeature
          : selectedFeature?.type === "line"
            ? selectedFeature
            : null;

      if (!target) return;

      const splitResult = splitLineFeature(target, snappedPoint);
      if (!splitResult) return;

      updateFeature(target.id, { coords: splitResult.first, synced: false });
      appendFeatures([
        {
          ...target,
          id: `feat-${crypto.randomUUID()}`,
          persistedId: null,
          coords: splitResult.second,
          label: `${target.label || "Trecho"} (ramo)`,
          synced: false,
          createdAt: Date.now(),
          updatedAt: undefined,
          createdAtIso: undefined,
        },
      ]);
      clearSelectionIds();
      setSelectedId(target.id);
      return;
    }

    if (workspaceTool === "JOIN_TRECHOS") {
      if (clickedFeature?.type !== "line") return;
      toggleSelectionId(clickedFeature.id);
      setSelectedId(clickedFeature.id);
      return;
    }

    setSelectedId(clickedFeature?.id ?? null);
    clearSelectionIds();
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (drawMode === "line" || drawMode === "polygon") {
      finishDraft();
      return;
    }

    if (workspaceTool === "MEASURE_DISTANCE" || workspaceTool === "MEASURE_AREA") {
      clearMeasurement();
    }
  };

  const handleVertexDrag = (vertexIndex: number) => (event: MarkerDragEvent) => {
    if (!selectedGeometry || workspaceTool !== "EDIT_GEOMETRY") return;

    const nextPoint = snapToNearestVertex(
      { lng: event.lngLat.lng, lat: event.lngLat.lat },
      features.filter((feature) => feature.id !== selectedGeometry.id),
      snapEnabled
    );

    const nextCoords = selectedGeometry.coords.map((coord, idx) =>
      idx === vertexIndex ? nextPoint : coord
    );

    updateFeature(selectedGeometry.id, { coords: nextCoords, synced: false });
  };

  const handleMoveDragEnd = (event: MarkerDragEvent) => {
    if (!selectedFeature || workspaceTool !== "MOVE") return;

    const currentAnchor = featureAnchor(selectedFeature);
    if (!currentAnchor) return;

    const nextPoint = snapToNearestVertex(
      { lng: event.lngLat.lng, lat: event.lngLat.lat },
      features.filter((feature) => feature.id !== selectedFeature.id),
      snapEnabled
    );

    if (selectedFeature.type === "line" || selectedFeature.type === "polygon") {
      const deltaLat = nextPoint.lat - currentAnchor.lat;
      const deltaLng = nextPoint.lng - currentAnchor.lng;
      updateFeature(selectedFeature.id, {
        coords: translateFeature(selectedFeature, deltaLat, deltaLng),
        synced: false,
      });
      return;
    }

    updateFeature(selectedFeature.id, { coords: [nextPoint], synced: false });
  };

  const geometriesGeoJson = useMemo<GeoJsonFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: geometryFeatures.map((feature) => {
        const coords = feature.coords.map((coord) => [coord.lng, coord.lat]);
        const lineStyle = feature.type === "line" ? getDrainageLineStyle(feature) : null;

        if (feature.type === "polygon" && coords.length > 2) {
          coords.push([feature.coords[0].lng, feature.coords[0].lat]);
        }

        const selectionState =
          feature.id === selectedId
            ? "selected"
            : selectionIds.includes(feature.id)
              ? "grouped"
              : spatialSearch.resultIds.includes(feature.id)
                ? "search"
                : "default";

        return {
          type: "Feature",
          geometry: {
            type: feature.type === "line" ? "LineString" : "Polygon",
            coordinates: feature.type === "line" ? coords : [coords],
          },
          properties: {
            id: feature.id,
            color: feature.color || "#3b82f6",
            lineColor: lineStyle?.lineColor ?? feature.color ?? "#3b82f6",
            lineWidth: lineStyle?.lineWidth ?? 4,
            lineOpacity: lineStyle?.lineOpacity ?? 0.94,
            selectionState,
          },
        };
      }),
    };
  }, [geometryFeatures, selectedId, selectionIds, spatialSearch.resultIds]);

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
          const style = getPointVisualStyle(feature);
          const selectionState =
            feature.id === selectedId
              ? "selected"
              : selectionIds.includes(feature.id)
                ? "grouped"
                : spatialSearch.resultIds.includes(feature.id)
                  ? "search"
                  : "default";

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
              selectionState,
            },
          };
        }),
    };
  }, [selectedId, selectionIds, spatialSearch.resultIds, syncedAssets]);

  const drawHint = useMemo(() => {
    if (drawMode === "line") {
      return activeTechnicalObjectType
        ? `Clique no mapa para desenhar ${getTechnicalObjectLabel(activeTechnicalObjectType)}. Bot?o direito finaliza o trecho.`
        : "Clique para adicionar v?rtices. Bot?o direito finaliza o trecho.";
    }
    if (drawMode === "polygon") {
      return activeTechnicalObjectType
        ? `Clique no mapa para desenhar ${getTechnicalObjectLabel(activeTechnicalObjectType)}. Bot?o direito fecha a ?rea.`
        : "Clique para adicionar v?rtices. Bot?o direito fecha a ?rea.";
    }
    if (drawMode !== "SELECT") {
      return `Clique no mapa para lan?ar ${
        ASSET_STYLES[drawMode as keyof typeof ASSET_STYLES]?.label ||
        getTechnicalObjectLabel(drawMode)
      }.`;
    }

    switch (workspaceTool) {
      case "EDIT_GEOMETRY":
        return selectedGeometry
          ? "Arraste os v?rtices em vermelho para editar a geometria selecionada."
          : "Selecione um trecho ou ?rea para editar a geometria.";
      case "MOVE":
        return selectedFeature
          ? "Arraste a al?a vermelha para mover o objeto selecionado."
          : "Selecione um objeto para mover.";
      case "MEASURE_DISTANCE":
        return "Clique no mapa para medir dist?ncia. Bot?o direito limpa a medi??o.";
      case "MEASURE_AREA":
        return "Clique no mapa para medir ?rea. Bot?o direito limpa a medi??o.";
      case "SPLIT_TRECHO":
        return "Selecione ou clique em um trecho para dividi-lo no ponto indicado.";
      case "JOIN_TRECHOS":
        return "Clique em dois trechos para selecionar e use a toolbar para unir.";
      case "SPATIAL_SEARCH":
        return "Clique no mapa para buscar itens dentro do raio configurado.";
      default:
        return null;
    }
  }, [
    activeTechnicalObjectType,
    drawMode,
    selectedFeature,
    selectedGeometry,
    workspaceTool,
  ]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-[#ffffff]", className)}
      onContextMenu={handleContextMenu}
    >
      {showEngineeringPanel ? <EngineeringPanel /> : null}

      {utmWarning && (
        <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-danger-600 px-6 py-3 text-white shadow-2xl">
          <p className="text-sm font-bold">Coordenadas possivelmente em UTM. Recomenda-se EPSG:4326.</p>
        </div>
      )}

      {showSelectionOverlay && selectedFeature && (
        <div className="absolute left-4 top-4 z-50 w-72 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold text-foreground">
            Selecionado: {selectedFeature.label || selectedFeature.type}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {workspaceTool === "EDIT_GEOMETRY" && selectedGeometry
              ? "Arraste os vértices para editar geometria."
              : workspaceTool === "MOVE"
                ? "Arraste a alça vermelha para mover o item."
                : "Ativo selecionado para inspeção técnica."}
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
                clearSelectionIds();
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
          className="absolute right-14 top-4 z-40 rounded-lg border border-border bg-card/90 p-2 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-muted"
        >
          {isFullscreen ? "⤢" : "⤢"}
        </button>
      ) : null}

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={activeMapStyle as never}
        onClick={handleMapClick}
        interactiveLayerIds={["geom-lines", "geom-polygons-fill", "geom-polygons-stroke", "assets-circle"]}
        cursor={
          drawMode !== "SELECT"
            ? "crosshair"
            : workspaceTool === "MOVE"
              ? "move"
              : workspaceTool === "MEASURE_DISTANCE" ||
                  workspaceTool === "MEASURE_AREA" ||
                  workspaceTool === "SPLIT_TRECHO" ||
                  workspaceTool === "SPATIAL_SEARCH"
                ? "crosshair"
                : "grab"
        }
      >
        <NavigationControl position="bottom-right" />

        {layers.basegis &&
          baseLayersSafe
            .filter((layer) => visibleBaseLayerIdSet.has(layer.id))
            .map((layer) => {
            const sourceId = `base-source-${layer.id}`;

            return (
              <React.Fragment key={layer.id}>
                <Source id={sourceId} type="geojson" data={layer.data as never} />

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
                    paint={{
                      "text-color": "#1e293b",
                      "text-halo-color": "#ffffff",
                      "text-halo-width": 1.8,
                    }}
                  />
                )}

                {layer.type === "PONNOT" && (
                  <>
                    <Layer
                      source={sourceId}
                      id={`infra-ponnot-circle-${layer.id}`}
                      type="circle"
                      filter={["==", ["geometry-type"], "Point"]}
                      paint={{
                        "circle-color": ["coalesce", ["get", "renderColor"], "#0f766e"],
                        "circle-radius": 5.5,
                        "circle-opacity": 0.9,
                        "circle-stroke-color": "#ecfeff",
                        "circle-stroke-width": 1.5,
                      }}
                    />
                    <Layer
                      source={sourceId}
                      id={`infra-ponnot-label-${layer.id}`}
                      type="symbol"
                      filter={["==", ["geometry-type"], "Point"]}
                      layout={{
                        "text-field": [
                          "coalesce",
                          ["get", "labelMultiline"],
                          ["get", "labelShort"],
                          ["get", "label"],
                          ["get", "COD_ID"],
                          ["get", "NOME"],
                          ["get", "name"],
                          ["get", "CODIGO"],
                          ["get", "codigo"],
                          layer.name,
                        ],
                        "text-size": 11,
                        "text-offset": [0, 1.35],
                        "text-anchor": "top",
                        "text-justify": "center",
                        "text-max-width": 14,
                      }}
                      paint={{
                        "text-color": "#115e59",
                        "text-halo-color": "#f0fdfa",
                        "text-halo-width": 1.25,
                      }}
                    />
                  </>
                )}

                {layer.type === "PONT_ILUM" && (
                  <>
                    <Layer
                      source={sourceId}
                      id={`infra-pont-ilum-circle-${layer.id}`}
                      type="circle"
                      filter={["==", ["geometry-type"], "Point"]}
                      paint={{
                        "circle-color": ["coalesce", ["get", "renderColor"], "#ca8a04"],
                        "circle-radius": 6,
                        "circle-opacity": 0.92,
                        "circle-stroke-color": "#fffbeb",
                        "circle-stroke-width": 1.5,
                      }}
                    />
                    <Layer
                      source={sourceId}
                      id={`infra-pont-ilum-label-${layer.id}`}
                      type="symbol"
                      minzoom={14}
                      filter={[
                        "all",
                        ["==", ["geometry-type"], "Point"],
                        ["has", "TXT_LUM"],
                        ["!=", ["get", "TXT_LUM"], ""],
                      ]}
                      layout={{
                        "text-field": ["get", "TXT_LUM"],
                        "text-size": 11,
                        "text-offset": [0, 1.2],
                        "text-anchor": "top",
                        "text-max-width": 18,
                      }}
                      paint={{
                        "text-color": "#854d0e",
                        "text-halo-color": "#fffbeb",
                        "text-halo-width": 1.25,
                      }}
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}

        {spatialSearchGeoJson && (
          <Source id="spatial-search-source" type="geojson" data={spatialSearchGeoJson as never}>
            <Layer
              id="spatial-search-fill"
              type="fill"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{ "fill-color": "#0ea5e9", "fill-opacity": 0.08 }}
            />
            <Layer
              id="spatial-search-line"
              type="line"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{ "line-color": "#0ea5e9", "line-width": 2, "line-dasharray": [2, 2] }}
            />
            <Layer
              id="spatial-search-point"
              type="circle"
              filter={["==", ["geometry-type"], "Point"]}
              paint={{
                "circle-color": "#0ea5e9",
                "circle-radius": 6,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2,
              }}
            />
          </Source>
        )}

        {measurementGeoJson && (
          <Source id="measurement-source" type="geojson" data={measurementGeoJson as never}>
            <Layer
              id="measurement-fill"
              type="fill"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{ "fill-color": "#f97316", "fill-opacity": 0.12 }}
            />
            <Layer
              id="measurement-line"
              type="line"
              filter={["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]]}
              paint={{ "line-color": "#f97316", "line-width": 3, "line-dasharray": [2, 2] }}
            />
            <Layer
              id="measurement-point"
              type="circle"
              filter={["==", ["geometry-type"], "Point"]}
              paint={{
                "circle-color": "#ffffff",
                "circle-radius": 5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#f97316",
              }}
            />
          </Source>
        )}

        {draftGeoJson && (
          <Source id="draft-source" type="geojson" data={draftGeoJson as never}>
            <Layer
              id="draft-polygon-fill"
              type="fill"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{ "fill-color": "#10b981", "fill-opacity": 0.28 }}
            />
            <Layer
              id="draft-line"
              type="line"
              filter={["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]]}
              paint={{ "line-color": "#10b981", "line-width": 3, "line-dasharray": [2, 2] }}
            />
            <Layer
              id="draft-points"
              type="circle"
              filter={["==", ["geometry-type"], "Point"]}
              paint={{
                "circle-color": "#ffffff",
                "circle-radius": 5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#10b981",
              }}
            />
          </Source>
        )}

        {layers.obras && (
          <Source id="geometries" type="geojson" data={geometriesGeoJson as never}>
            <Layer
              id="geom-lines"
              type="line"
              filter={["==", ["geometry-type"], "LineString"]}
              paint={{
                "line-color": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  "#f43f5e",
                  "grouped",
                  "#10b981",
                  "search",
                  "#0ea5e9",
                  ["get", "lineColor"],
                ],
                "line-width": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  6,
                  "grouped",
                  5,
                  "search",
                  5,
                  ["get", "lineWidth"],
                ],
                "line-opacity": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  1,
                  "grouped",
                  1,
                  "search",
                  1,
                  ["get", "lineOpacity"],
                ],
              }}
            />
            <Layer
              id="geom-polygons-fill"
              type="fill"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "fill-color": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  "#f43f5e",
                  "grouped",
                  "#10b981",
                  "search",
                  "#0ea5e9",
                  ["get", "color"],
                ],
                "fill-opacity": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  0.2,
                  "grouped",
                  0.18,
                  "search",
                  0.16,
                  0.26,
                ],
              }}
            />
            <Layer
              id="geom-polygons-stroke"
              type="line"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "line-color": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  "#f43f5e",
                  "grouped",
                  "#10b981",
                  "search",
                  "#0ea5e9",
                  ["get", "color"],
                ],
                "line-width": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  3,
                  "grouped",
                  3,
                  "search",
                  3,
                  2,
                ],
              }}
            />
          </Source>
        )}

        {layers.ativos && (
          <Source id="synced-assets" type="geojson" data={syncedAssetsGeoJson as never}>
            <Layer
              id="assets-circle"
              type="circle"
              paint={{
                "circle-color": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  "#f43f5e",
                  "grouped",
                  "#10b981",
                  "search",
                  "#0ea5e9",
                  ["get", "color"],
                ],
                "circle-radius": [
                  "match",
                  ["get", "selectionState"],
                  "selected",
                  15,
                  "grouped",
                  15,
                  "search",
                  14,
                  13,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
            <Layer
              id="assets-symbol"
              type="symbol"
              layout={{ "text-field": ["get", "icon"], "text-size": 14, "text-allow-overlap": true }}
            />
          </Source>
        )}

        {layers.ativos &&
          unsyncedAssets.map((feature) => {
            const style = getPointVisualStyle(feature);
            if (!style || !hasValidPoint(feature.coords)) return null;

            const isSelected = selectedId === feature.id;
            const isGrouped = selectionIds.includes(feature.id);
            const isSpatialHit = spatialSearch.resultIds.includes(feature.id);

            return (
              <Marker key={feature.id} longitude={feature.coords[0].lng} latitude={feature.coords[0].lat} anchor="bottom">
                <button
                  onClick={() => {
                    setSelectedId(feature.id);
                    if (workspaceTool === "JOIN_TRECHOS") {
                      toggleSelectionId(feature.id);
                    } else {
                      clearSelectionIds();
                    }
                  }}
                  className="group relative flex cursor-pointer flex-col items-center"
                >
                  <div className="absolute -top-12 z-50 hidden flex-col items-center whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-xl group-hover:flex">
                    <span>{feature.label || style.label}</span>
                    <span className="mt-0.5 text-[9px] text-warning-500">Pendente no BD</span>
                  </div>

                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", style.color)} />
                    <div
                      className={cn(
                        "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-125 ring-4",
                        isSelected
                          ? "bg-danger-500 ring-danger-500/50"
                          : isGrouped
                            ? "bg-emerald-500 ring-emerald-500/50"
                            : isSpatialHit
                              ? "bg-sky-500 ring-sky-500/50"
                              : `${style.color} ${style.ring}`
                      )}
                    >
                      {style.icon}
                    </div>
                  </div>
                  <div className="h-3 w-[2px] rounded-b-full bg-white/90 shadow-sm" />
                </button>
              </Marker>
            );
          })}

        {workspaceTool === "EDIT_GEOMETRY" &&
          selectedGeometry?.coords.map((point, index) => (
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

        {workspaceTool === "MOVE" && selectedAnchor ? (
          <Marker
            longitude={selectedAnchor.lng}
            latitude={selectedAnchor.lat}
            draggable
            onDragEnd={handleMoveDragEnd}
            anchor="center"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-danger-500 text-xs font-bold text-white shadow-lg">
              +
            </div>
          </Marker>
        ) : null}
      </Map>

      {showDrawHint && drawHint ? (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brand-400 bg-brand-600/90 px-6 py-2.5 text-sm font-bold text-white shadow-2xl backdrop-blur-md">
          {drawHint}
        </div>
      ) : null}
    </div>
  );
}
