"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DrawingToolbar } from "@/components/map/drawing-toolbar";
import { LayerPanel } from "@/components/map/layer-panel";
import { MapCanvas } from "@/components/map/map-canvas";
import {
  type AssetCategory,
  type BaseLayerData,
  type DrawnFeature,
  useMapStore,
} from "@/store/useMapStore";

type AssetTypeFilter = "ALL" | "PONTO" | "TRECHO" | "AREA";

interface ProjectOption {
  id: string;
  label: string;
}

const ASSET_CATEGORIES: AssetCategory[] = [
  "BOCA_LOBO",
  "POCO_VISITA",
  "HIDRANTE",
  "SEMAFORO",
  "PLACA_TRANSITO",
  "LOMBADA",
  "PONTO_ONIBUS",
  "RADAR",
  "POSTE_LUZ",
  "ARVORE",
  "LIXEIRA",
  "BURACO",
];

const ASSET_CATEGORY_SET = new Set<AssetCategory>(ASSET_CATEGORIES);

function isAssetCategory(value: string): value is AssetCategory {
  return ASSET_CATEGORY_SET.has(value as AssetCategory);
}

function parseCoordPair(rawPair: string): { lng: number; lat: number } | null {
  const [lngRaw, latRaw] = rawPair.trim().split(/\s+/);
  const lng = Number(lngRaw);
  const lat = Number(latRaw);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function parseCoordList(rawCoords: string): { lng: number; lat: number }[] {
  return rawCoords
    .split(",")
    .map((pair) => parseCoordPair(pair))
    .filter((point): point is { lng: number; lat: number } => point !== null);
}

function wktToCoords(wkt: string | null | undefined): { lng: number; lat: number }[] {
  if (!wkt || typeof wkt !== "string") return [];
  const trimmed = wkt.trim();

  const pointMatch = trimmed.match(/^POINT\s*\((.+)\)$/i);
  if (pointMatch) {
    const point = parseCoordPair(pointMatch[1]);
    return point ? [point] : [];
  }

  const lineMatch = trimmed.match(/^LINESTRING\s*\((.+)\)$/i);
  if (lineMatch) {
    return parseCoordList(lineMatch[1]);
  }

  const polygonMatch = trimmed.match(/^POLYGON\s*\(\((.+)\)\)$/i);
  if (polygonMatch) {
    const firstRingRaw = polygonMatch[1].split(/\)\s*,\s*\(/)[0];
    return parseCoordList(firstRingRaw);
  }

  return [];
}

function geometryToCoords(geometry: any): { lng: number; lat: number }[] {
  if (!geometry || typeof geometry !== "object") return [];
  const { type, coordinates } = geometry;
  if (!coordinates) return [];

  if (type === "Point" && Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    return [{ lng, lat }];
  }

  if (type === "LineString" && Array.isArray(coordinates)) {
    return coordinates
      .map((pair) =>
        Array.isArray(pair)
          ? { lng: Number(pair[0]), lat: Number(pair[1]) }
          : null
      )
      .filter((point): point is { lng: number; lat: number } => !!point && Number.isFinite(point.lng) && Number.isFinite(point.lat));
  }

  if (type === "Polygon" && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
    return coordinates[0]
      .map((pair) =>
        Array.isArray(pair)
          ? { lng: Number(pair[0]), lat: Number(pair[1]) }
          : null
      )
      .filter((point): point is { lng: number; lat: number } => !!point && Number.isFinite(point.lng) && Number.isFinite(point.lat));
  }

  if (type === "MultiLineString" && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
    return geometryToCoords({ type: "LineString", coordinates: coordinates[0] });
  }

  if (type === "MultiPolygon" && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
    return geometryToCoords({ type: "Polygon", coordinates: coordinates[0] });
  }

  return [];
}

function getGeoJsonCenter(geojson: any) {
  if (!geojson) return null;

  let minLng = 180;
  let maxLng = -180;
  let minLat = 90;
  let maxLat = -90;
  let found = false;

  const extract = (coords: any): void => {
    if (!Array.isArray(coords) || coords.length === 0) return;

    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
      found = true;
      return;
    }

    coords.forEach(extract);
  };

  try {
    if (Array.isArray(geojson?.features)) {
      geojson.features.forEach((feature: any) => {
        if (feature?.geometry?.coordinates) {
          extract(feature.geometry.coordinates);
        }
      });
    } else if (geojson?.geometry?.coordinates) {
      extract(geojson.geometry.coordinates);
    }
  } catch (error) {
    console.error("Erro ao extrair centro do GeoJSON", error);
  }

  if (!found) return null;
  return { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
}

function normalizeBaseLayer(layer: any): BaseLayerData | null {
  if (!layer || typeof layer !== "object") return null;
  if (typeof layer.id !== "string" || typeof layer.name !== "string") return null;
  if (!["BOUNDARY", "STREETS", "STREET_NAMES"].includes(layer.type)) return null;

  let geoJsonData = layer.geoJsonData;
  try {
    if (typeof geoJsonData === "string") {
      geoJsonData = JSON.parse(geoJsonData);
    }
  } catch (error) {
    console.error("Baselayer com JSON invalido", layer.id, error);
    geoJsonData = null;
  }

  if (Array.isArray(geoJsonData)) {
    geoJsonData = geoJsonData[0];
  }

  if (!geoJsonData || geoJsonData.type !== "FeatureCollection") {
    geoJsonData = { type: "FeatureCollection", features: [] };
  }

  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    geoJsonData,
  };
}

function inferFeatureType(assetType: string, subType?: unknown): DrawnFeature["type"] {
  if (assetType === "TRECHO") return "line";
  if (assetType === "AREA") return "polygon";

  if (typeof subType === "string" && isAssetCategory(subType)) {
    return subType;
  }

  return "BOCA_LOBO";
}

function coordsToWkt(feature: DrawnFeature): string | null {
  if (!Array.isArray(feature.coords) || feature.coords.length === 0) return null;

  if (feature.type === "line") {
    if (feature.coords.length < 2) return null;
    const points = feature.coords.map((coord) => `${coord.lng} ${coord.lat}`).join(", ");
    return `LINESTRING(${points})`;
  }

  if (feature.type === "polygon") {
    if (feature.coords.length < 3) return null;
    const points = feature.coords.map((coord) => `${coord.lng} ${coord.lat}`);
    const first = points[0];
    const last = points[points.length - 1];
    if (first !== last) points.push(first);
    return `POLYGON((${points.join(", ")}))`;
  }

  const [point] = feature.coords;
  if (!point) return null;
  return `POINT(${point.lng} ${point.lat})`;
}

function normalizeProjectOptions(rawFeatures: any[]): ProjectOption[] {
  const byId = new Map<string, ProjectOption>();

  rawFeatures.forEach((feature) => {
    const props = feature?.properties ?? {};
    const projectId = typeof props.projectId === "string" ? props.projectId : null;
    if (!projectId) return;

    const projectName = typeof props.projectName === "string" && props.projectName.trim()
      ? props.projectName.trim()
      : `Projeto ${projectId.slice(-6)}`;

    byId.set(projectId, { id: projectId, label: projectName });
  });

  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function toDrawnFeature(rawFeature: any): DrawnFeature | null {
  const properties = rawFeature?.properties ?? {};
  const id = typeof properties.id === "string" ? properties.id : null;
  if (!id) return null;

  const coordsFromGeometry = geometryToCoords(rawFeature?.geometry);
  const coords = coordsFromGeometry.length > 0 ? coordsFromGeometry : wktToCoords(properties.geomWkt);

  const featureType = inferFeatureType(
    typeof properties.type === "string" ? properties.type : "PONTO",
    properties.subType
  );

  return {
    id,
    type: featureType,
    coords,
    synced: true,
    attributes: properties,
    label: typeof properties.name === "string" ? properties.name : undefined,
    projectId: typeof properties.projectId === "string" ? properties.projectId : undefined,
    createdAt: Date.now(),
  };
}

export default function ProjetosPage() {
  const {
    features,
    unsavedCount,
    syncAll,
    setBaseLayersData,
    flyToCity,
    replaceFeatures,
  } = useMapStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

  const syncDisabled = unsavedCount === 0 || isSyncing;

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({ limit: "2000" });
      if (assetTypeFilter !== "ALL") params.set("type", assetTypeFilter);
      if (projectFilter !== "ALL") params.set("projectId", projectFilter);

      const [gisRes, baseRes] = await Promise.all([
        fetch(`/api/gis?${params.toString()}`, { signal }),
        fetch("/api/baselayers", { signal }),
      ]);

      if (!gisRes.ok) {
        throw new Error(`Falha ao carregar ativos GIS (${gisRes.status})`);
      }

      if (!baseRes.ok) {
        throw new Error(`Falha ao carregar baselayers (${baseRes.status})`);
      }

      const [gisJson, baseJson] = await Promise.all([gisRes.json(), baseRes.json()]);

      const rawFeatures = Array.isArray(gisJson?.data?.features) ? gisJson.data.features : [];
      const parsedFeatures = rawFeatures
        .map((feature: any) => toDrawnFeature(feature))
        .filter((feature: DrawnFeature | null): feature is DrawnFeature => feature !== null);

      replaceFeatures(parsedFeatures);
      setProjectOptions(normalizeProjectOptions(rawFeatures));

      const normalizedLayers: BaseLayerData[] = Array.isArray(baseJson?.data)
        ? baseJson.data
            .map((layer: any) => normalizeBaseLayer(layer))
            .filter((layer: BaseLayerData | null): layer is BaseLayerData => layer !== null)
        : [];

      setBaseLayersData(normalizedLayers);

      const targetLayer =
        normalizedLayers.find((layer) => layer.type === "BOUNDARY") ||
        normalizedLayers.find((layer) => layer.type === "STREETS") ||
        normalizedLayers.find((layer) => layer.type === "STREET_NAMES");

      if (targetLayer?.geoJsonData) {
        const center = getGeoJsonCenter(targetLayer.geoJsonData);
        if (center) {
          flyToCity(center.lng, center.lat, 13);
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error("Erro ao carregar modulo GIS", error);
      setLoadError(error instanceof Error ? error.message : "Erro inesperado ao carregar GIS");
      replaceFeatures([]);
      setBaseLayersData([]);
    } finally {
      setIsLoading(false);
    }
  }, [assetTypeFilter, projectFilter, replaceFeatures, setBaseLayersData, flyToCity]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, refreshTick]);

  const visibleUnsaved = useMemo(() => {
    return features.filter((feature) => !feature.synced);
  }, [features]);

  const handleSync = async () => {
    if (visibleUnsaved.length === 0) return;

    setIsSyncing(true);

    try {
      const requests = visibleUnsaved
        .map((feature) => {
          const dbType = feature.type === "line" ? "TRECHO" : feature.type === "polygon" ? "AREA" : "PONTO";
          const geomWkt = coordsToWkt(feature);
          if (!geomWkt) return null;

          const subType = feature.type === "line" || feature.type === "polygon" ? undefined : feature.type;

          return fetch("/api/gis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: feature.label || "Ativo Sem Nome",
              type: dbType,
              geomWkt,
              projectId: feature.projectId ?? (projectFilter !== "ALL" ? projectFilter : null),
              attributes: {
                ...(feature.attributes ?? {}),
                ...(subType ? { subType } : {}),
              },
            }),
          }).then(async (response) => {
            if (!response.ok) {
              const payload = await response.json().catch(() => null);
              const message = payload?.error || `Falha no POST /api/gis (${response.status})`;
              throw new Error(message);
            }
          });
        })
        .filter((request): request is Promise<void> => request !== null);

      if (requests.length === 0) {
        throw new Error("Nao ha geometrias validas para sincronizar.");
      }

      await Promise.all(requests);
      syncAll();
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      console.error("Erro ao sincronizar GIS", error);
      alert(error instanceof Error ? error.message : "Falha ao sincronizar geometrias.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportGeoJson = () => {
    const exportPayload = {
      type: "FeatureCollection",
      features: features.map((feature) => {
        const coords = feature.coords.map((coord) => [coord.lng, coord.lat]);

        if (feature.type === "line") {
          return {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: { id: feature.id, ...feature.attributes, type: feature.type },
          };
        }

        if (feature.type === "polygon") {
          const closed = coords.length > 2 ? [...coords, coords[0]] : coords;
          return {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [closed] },
            properties: { id: feature.id, ...feature.attributes, type: feature.type },
          };
        }

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: coords[0] ?? [0, 0] },
          properties: { id: feature.id, ...feature.attributes, type: feature.type },
        };
      }),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `urban-gis-${Date.now()}.geojson`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background relative overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md z-10 relative gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="font-display text-lg font-bold text-foreground">Gestao de Projetos GIS</h1>
          {isLoading && (
            <span className="flex items-center gap-2 text-xs text-brand-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" /> Carregando dados GIS...
            </span>
          )}
          {loadError && <span className="text-xs font-semibold text-danger-600">{loadError}</span>}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={assetTypeFilter}
            onChange={(event) => setAssetTypeFilter(event.target.value as AssetTypeFilter)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">Todos os tipos</option>
            <option value="PONTO">Pontos</option>
            <option value="TRECHO">Trechos</option>
            <option value="AREA">Areas</option>
          </select>

          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">Todos os projetos</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>{project.label}</option>
            ))}
          </select>

          {unsavedCount > 0 && (
            <span className="text-xs font-bold text-warning-500 bg-warning-500/10 px-3 py-1.5 rounded-full animate-pulse">
              {unsavedCount} ativo(s) pendente(s)
            </span>
          )}

          <button
            onClick={handleSync}
            disabled={syncDisabled}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white transition-all rounded-lg shadow-sm ${
              !syncDisabled
                ? "bg-brand-600 hover:bg-brand-500 hover:shadow-brand-500/20"
                : "bg-slate-700 opacity-50 cursor-not-allowed"
            }`}
          >
            {isSyncing ? "Sincronizando..." : "Salvar na Base"}
          </button>
        </div>
      </header>

      <div className="flex-1 relative w-full h-full">
        <div className="absolute inset-0"><MapCanvas /></div>
        <DrawingToolbar />
        <LayerPanel className="absolute right-4 top-4 w-64 shadow-2xl" onExportGeoJSON={handleExportGeoJson} />
      </div>
    </div>
  );
}
