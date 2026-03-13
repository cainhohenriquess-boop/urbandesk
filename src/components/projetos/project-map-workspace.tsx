"use client";

import Link from "next/link";
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

type ProjectMapWorkspaceProps = {
  projectId: string;
  projectName: string;
};

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
      .filter(
        (point): point is { lng: number; lat: number } =>
          !!point && Number.isFinite(point.lng) && Number.isFinite(point.lat)
      );
  }

  if (type === "Polygon" && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
    return coordinates[0]
      .map((pair) =>
        Array.isArray(pair)
          ? { lng: Number(pair[0]), lat: Number(pair[1]) }
          : null
      )
      .filter(
        (point): point is { lng: number; lat: number } =>
          !!point && Number.isFinite(point.lng) && Number.isFinite(point.lat)
      );
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
    console.error("Baselayer com JSON inválido", layer.id, error);
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
    const points = feature.coords
      .map((coord) => `${coord.lng} ${coord.lat}`)
      .join(", ");
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

function toDrawnFeature(rawFeature: any): DrawnFeature | null {
  const properties = rawFeature?.properties ?? {};
  const id = typeof properties.id === "string" ? properties.id : null;
  if (!id) return null;

  const coordsFromGeometry = geometryToCoords(rawFeature?.geometry);
  const coords =
    coordsFromGeometry.length > 0
      ? coordsFromGeometry
      : wktToCoords(properties.geomWkt);

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

export function ProjectMapWorkspace({
  projectId,
  projectName,
}: ProjectMapWorkspaceProps) {
  const {
    features,
    unsavedCount,
    syncAll,
    setBaseLayersData,
    flyToCity,
    replaceFeatures,
    setActiveProjectId,
  } = useMapStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>("ALL");

  const syncDisabled = unsavedCount === 0 || isSyncing;

  useEffect(() => {
    setActiveProjectId(projectId);
    return () => setActiveProjectId(null);
  }, [projectId, setActiveProjectId]);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams({
          limit: "2000",
          projectId,
        });

        if (assetTypeFilter !== "ALL") params.set("type", assetTypeFilter);

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

        const rawFeatures = Array.isArray(gisJson?.data?.features)
          ? gisJson.data.features
          : [];
        const parsedFeatures = rawFeatures
          .map((feature: any) => toDrawnFeature(feature))
          .filter((feature: DrawnFeature | null): feature is DrawnFeature => feature !== null);

        replaceFeatures(parsedFeatures);

        const normalizedLayers: BaseLayerData[] = Array.isArray(baseJson?.data)
          ? baseJson.data
              .map((layer: any) => normalizeBaseLayer(layer))
              .filter(
                (layer: BaseLayerData | null): layer is BaseLayerData => layer !== null
              )
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
        console.error("Erro ao carregar mapa do projeto", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar mapa do projeto."
        );
        replaceFeatures([]);
        setBaseLayersData([]);
      } finally {
        setIsLoading(false);
      }
    },
    [assetTypeFilter, flyToCity, projectId, replaceFeatures, setBaseLayersData]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, refreshTick]);

  const visibleUnsaved = useMemo(
    () => features.filter((feature) => !feature.synced),
    [features]
  );

  const handleSync = async () => {
    if (visibleUnsaved.length === 0) return;

    setIsSyncing(true);

    try {
      const requests = visibleUnsaved
        .map((feature) => {
          const dbType =
            feature.type === "line"
              ? "TRECHO"
              : feature.type === "polygon"
                ? "AREA"
                : "PONTO";
          const geomWkt = coordsToWkt(feature);
          if (!geomWkt) return null;

          const subType =
            feature.type === "line" || feature.type === "polygon"
              ? undefined
              : feature.type;

          return fetch("/api/gis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: feature.label || "Ativo sem nome",
              type: dbType,
              geomWkt,
              projectId,
              attributes: {
                ...(feature.attributes ?? {}),
                ...(subType ? { subType } : {}),
              },
            }),
          }).then(async (response) => {
            if (!response.ok) {
              const payload = await response.json().catch(() => null);
              const message =
                payload?.error || `Falha no POST /api/gis (${response.status})`;
              throw new Error(message);
            }
          });
        })
        .filter((request): request is Promise<void> => request !== null);

      if (requests.length === 0) {
        throw new Error("Não há geometrias válidas para sincronizar.");
      }

      await Promise.all(requests);
      syncAll();
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      console.error("Erro ao sincronizar mapa do projeto", error);
      alert(
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar geometrias."
      );
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

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `urban-gis-${projectId}.geojson`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex h-[calc(100vh-19rem)] min-h-[700px] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/80 px-6 backdrop-blur-md">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">
            Workspace técnico
          </p>
          <div className="mt-1 flex items-center gap-4 min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-foreground">
              {projectName}
            </h2>
            {isLoading && (
              <span className="flex items-center gap-2 text-xs font-medium text-brand-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                Carregando mapa...
              </span>
            )}
            {loadError && (
              <span className="text-xs font-semibold text-danger-600">
                {loadError}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/app/projetos/${projectId}`}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            Ficha 360º
          </Link>

          <select
            value={assetTypeFilter}
            onChange={(event) =>
              setAssetTypeFilter(event.target.value as AssetTypeFilter)
            }
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">Todos os tipos</option>
            <option value="PONTO">Pontos</option>
            <option value="TRECHO">Trechos</option>
            <option value="AREA">Áreas</option>
          </select>

          {unsavedCount > 0 && (
            <span className="rounded-full bg-warning-500/10 px-3 py-1.5 text-xs font-bold text-warning-500 animate-pulse">
              {unsavedCount} ativo(s) pendente(s)
            </span>
          )}

          <button
            onClick={handleSync}
            disabled={syncDisabled}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-all shadow-sm ${
              !syncDisabled
                ? "bg-brand-600 hover:bg-brand-500 hover:shadow-brand-500/20"
                : "cursor-not-allowed bg-slate-700 opacity-50"
            }`}
          >
            {isSyncing ? "Sincronizando..." : "Salvar na base"}
          </button>
        </div>
      </header>

      <div className="relative h-full w-full flex-1">
        <div className="absolute inset-0">
          <MapCanvas />
        </div>
        <DrawingToolbar />
        <LayerPanel
          className="absolute right-4 top-4 w-64 shadow-2xl"
          onExportGeoJSON={handleExportGeoJson}
        />
      </div>
    </div>
  );
}
