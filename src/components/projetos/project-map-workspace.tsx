"use client";

import type {
  ProjectOperationalStatus,
  ProjectStatus,
  ProjectTechnicalArea,
} from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/map/map-canvas";
import {
  ProjectBadge,
  ProjectEmptyBlock,
} from "@/components/projetos/project-detail-components";
import { ProjectMapGlobalToolbar } from "@/components/projetos/project-map-global-toolbar";
import {
  importGeoJsonFeatures,
  joinLineFeatures,
  measureArea,
  measureDistance,
} from "@/lib/map-workspace-tools";
import {
  getProjectOperationalStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { getProjectStatusLabel } from "@/lib/project-portfolio";
import { areaPoligonoM2, comprimentoTrechoM } from "@/lib/turf";
import {
  cn,
  formatArea,
  formatCoords,
  formatDateTime,
  formatDistance,
  formatNumber,
} from "@/lib/utils";
import {
  type AssetCategory,
  type BaseLayerData,
  type DrawMode,
  type DrawnFeature,
  type LayerVisibility,
  type MapStyle,
  useMapStore,
} from "@/store/useMapStore";

type AssetTypeFilter = "ALL" | "PONTO" | "TRECHO" | "AREA";

type ProjectMapWorkspaceProject = {
  id: string;
  name: string;
  code: string | null;
  status: ProjectStatus;
  operationalStatus: ProjectOperationalStatus;
  responsibleDepartment: string | null;
  neighborhood: string | null;
  region: string | null;
  technicalAreas: ProjectTechnicalArea[];
  _count: {
    assets: number;
    documents: number;
    measurements: number;
    inspections: number;
  };
};

type ProjectMapWorkspaceProps = {
  project: ProjectMapWorkspaceProject;
};

type AssetLogRecord = {
  id: string;
  note: string;
  photos: string[];
  lat: number | null;
  lng: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type AssetDetailRecord = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  photos: string[];
  geomWkt: string | null;
  createdAt: string;
  updatedAt: string;
  attributes: Record<string, unknown>;
  projectId: string | null;
  project: {
    id: string;
    name: string;
  } | null;
  logs: AssetLogRecord[];
  _count: {
    issues: number;
    logs: number;
  };
};

type InspectorFormState = {
  name: string;
  description: string;
  status: string;
  front: string;
  responsible: string;
  notes: string;
};

const EMPTY_FORM: InspectorFormState = {
  name: "",
  description: "",
  status: "",
  front: "",
  responsible: "",
  notes: "",
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

const MAP_STYLES: Array<{ id: MapStyle; label: string; helper: string }> = [
  { id: "gis", label: "Base GIS", helper: "Limites e ruas" },
  { id: "satellite", label: "Satélite", helper: "Imagem orbital" },
  { id: "topography", label: "Topografia", helper: "Relevo e contexto" },
];

const LAYER_DEFS: Array<{
  key: keyof LayerVisibility;
  label: string;
  description: string;
  tone: string;
}> = [
  { key: "basegis", label: "Base cartográfica", description: "Shapefiles de limite e ruas", tone: "bg-sky-500" },
  { key: "ativos", label: "Ativos", description: "Pontos persistidos e pendentes", tone: "bg-brand-600" },
  { key: "obras", label: "Geometrias", description: "Trechos e áreas técnicas", tone: "bg-amber-500" },
  { key: "alertas", label: "Alertas", description: "Preparado para eventos críticos", tone: "bg-danger-500" },
  { key: "viario", label: "Viário", description: "Camada reservada para rede temática", tone: "bg-slate-500" },
  { key: "topografia", label: "Topografia", description: "Curvas e relevo futuro", tone: "bg-emerald-500" },
];

const TOOL_GROUPS: Array<{
  title: string;
  items: Array<{ id: DrawMode; label: string; helper: string }>;
}> = [
  {
    title: "Navegação",
    items: [{ id: "SELECT", label: "Selecionar", helper: "Inspecionar e editar" }],
  },
  {
    title: "Geometria",
    items: [
      { id: "line", label: "Trecho/Rede", helper: "Desenho linear" },
      { id: "polygon", label: "Área/Lote", helper: "Desenho poligonal" },
    ],
  },
  {
    title: "Saneamento",
    items: [
      { id: "BOCA_LOBO", label: "Boca de lobo", helper: "Drenagem" },
      { id: "POCO_VISITA", label: "Poço de visita", helper: "Rede subterrânea" },
      { id: "HIDRANTE", label: "Hidrante", helper: "Segurança hídrica" },
    ],
  },
  {
    title: "Mobilidade",
    items: [
      { id: "SEMAFORO", label: "Semáforo", helper: "Controle viário" },
      { id: "PLACA_TRANSITO", label: "Sinalização", helper: "Placas e avisos" },
      { id: "LOMBADA", label: "Lombada", helper: "Moderação de tráfego" },
    ],
  },
  {
    title: "Zeladoria",
    items: [
      { id: "POSTE_LUZ", label: "Poste de luz", helper: "Iluminação pública" },
      { id: "ARVORE", label: "Árvore", helper: "Arborização" },
      { id: "BURACO", label: "Buraco", helper: "Manutenção viária" },
    ],
  },
];

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

function geometryToCoords(geometry: unknown): { lng: number; lat: number }[] {
  if (!geometry || typeof geometry !== "object") return [];
  const typed = geometry as { type?: string; coordinates?: unknown };
  const { type, coordinates } = typed;
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
        Array.isArray(pair) ? { lng: Number(pair[0]), lat: Number(pair[1]) } : null
      )
      .filter(
        (point): point is { lng: number; lat: number } =>
          !!point && Number.isFinite(point.lng) && Number.isFinite(point.lat)
      );
  }

  if (type === "Polygon" && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
    return coordinates[0]
      .map((pair) =>
        Array.isArray(pair) ? { lng: Number(pair[0]), lat: Number(pair[1]) } : null
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
function getGeoJsonCenter(geojson: unknown) {
  if (!geojson || typeof geojson !== "object") return null;

  let minLng = 180;
  let maxLng = -180;
  let minLat = 90;
  let maxLat = -90;
  let found = false;

  const extract = (coords: unknown): void => {
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

  const typed = geojson as { features?: Array<{ geometry?: { coordinates?: unknown } }>; geometry?: { coordinates?: unknown } };
  if (Array.isArray(typed.features)) {
    typed.features.forEach((feature) => {
      if (feature?.geometry?.coordinates) extract(feature.geometry.coordinates);
    });
  } else if (typed.geometry?.coordinates) {
    extract(typed.geometry.coordinates);
  }

  if (!found) return null;
  return { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
}

function normalizeBaseLayer(layer: unknown): BaseLayerData | null {
  if (!layer || typeof layer !== "object") return null;
  const typed = layer as { id?: unknown; name?: unknown; type?: unknown; geoJsonData?: unknown };
  if (typeof typed.id !== "string" || typeof typed.name !== "string") return null;
  if (!typed.type || !["BOUNDARY", "STREETS", "STREET_NAMES"].includes(String(typed.type))) {
    return null;
  }

  let geoJsonData = typed.geoJsonData;
  try {
    if (typeof geoJsonData === "string") {
      geoJsonData = JSON.parse(geoJsonData);
    }
  } catch (error) {
    console.error("Baselayer com JSON inválido", typed.id, error);
    geoJsonData = null;
  }

  if (Array.isArray(geoJsonData)) {
    geoJsonData = geoJsonData[0];
  }

  if (!geoJsonData || (geoJsonData as { type?: string }).type !== "FeatureCollection") {
    geoJsonData = { type: "FeatureCollection", features: [] };
  }

  return {
    id: typed.id,
    name: typed.name,
    type: typed.type as BaseLayerData["type"],
    geoJsonData,
  };
}

function inferFeatureType(assetType: string, subType?: unknown): DrawnFeature["type"] {
  if (assetType === "TRECHO") return "line";
  if (assetType === "AREA") return "polygon";
  if (typeof subType === "string" && isAssetCategory(subType)) return subType;
  return "BOCA_LOBO";
}

function normalizePhotoList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
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
    if (points[0] !== points[points.length - 1]) points.push(points[0]);
    return `POLYGON((${points.join(", ")}))`;
  }

  const [point] = feature.coords;
  return point ? `POINT(${point.lng} ${point.lat})` : null;
}

function toDrawnFeature(rawFeature: unknown): DrawnFeature | null {
  if (!rawFeature || typeof rawFeature !== "object") return null;
  const typed = rawFeature as { geometry?: unknown; properties?: Record<string, unknown> };
  const properties = typed.properties ?? {};
  const id = typeof properties.id === "string" ? properties.id : null;
  if (!id) return null;

  const coordsFromGeometry = geometryToCoords(typed.geometry);
  const coords = coordsFromGeometry.length > 0 ? coordsFromGeometry : wktToCoords(properties.geomWkt as string | undefined);
  const createdAtIso = typeof properties.createdAt === "string" ? properties.createdAt : undefined;

  return {
    id,
    persistedId: id,
    type: inferFeatureType(typeof properties.type === "string" ? properties.type : "PONTO", properties.subType),
    coords,
    synced: true,
    label: typeof properties.name === "string" ? properties.name : undefined,
    description: typeof properties.description === "string" ? properties.description : null,
    photos: normalizePhotoList(properties.photos),
    projectId: typeof properties.projectId === "string" ? properties.projectId : undefined,
    updatedAt: typeof properties.updatedAt === "string" ? properties.updatedAt : undefined,
    createdAtIso,
    attributes: properties,
    createdAt: createdAtIso ? new Date(createdAtIso).getTime() : Date.now(),
  };
}

function compactAttributes(source: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    })
  );
}

function featureTypeLabel(type: DrawnFeature["type"]) {
  switch (type) {
    case "line":
      return "Trecho / rede";
    case "polygon":
      return "Área / polígono";
    case "BOCA_LOBO":
      return "Boca de lobo";
    case "POCO_VISITA":
      return "Poço de visita";
    case "HIDRANTE":
      return "Hidrante";
    case "SEMAFORO":
      return "Semáforo";
    case "PLACA_TRANSITO":
      return "Sinalização";
    case "LOMBADA":
      return "Lombada";
    case "PONTO_ONIBUS":
      return "Ponto de ônibus";
    case "RADAR":
      return "Radar";
    case "POSTE_LUZ":
      return "Poste de luz";
    case "ARVORE":
      return "Árvore";
    case "LIXEIRA":
      return "Lixeira";
    case "BURACO":
      return "Buraco";
    default:
      return type;
  }
}

function featureMetricLabel(feature: DrawnFeature) {
  if (feature.type === "line") {
    return formatDistance(
      comprimentoTrechoM(feature.coords.map((coord) => [coord.lat, coord.lng] as [number, number]))
    );
  }

  if (feature.type === "polygon") {
    return formatArea(
      areaPoligonoM2(feature.coords.map((coord) => [coord.lat, coord.lng] as [number, number]))
    );
  }

  const point = feature.coords[0];
  return point ? formatCoords(point.lat, point.lng) : "Sem coordenadas";
}

function geometrySummary(feature: DrawnFeature) {
  if (feature.type === "line") return `${formatNumber(feature.coords.length)} vértices`;
  if (feature.type === "polygon") return `${formatNumber(feature.coords.length)} vértices`;
  return feature.coords[0] ? formatCoords(feature.coords[0].lat, feature.coords[0].lng) : "Sem coordenadas";
}

function workspaceToolLabel(tool: string) {
  switch (tool) {
    case "SELECT":
      return "seleção";
    case "EDIT_GEOMETRY":
      return "edição de geometria";
    case "MOVE":
      return "mover";
    case "MEASURE_DISTANCE":
      return "medir distância";
    case "MEASURE_AREA":
      return "medir área";
    case "SPLIT_TRECHO":
      return "dividir trecho";
    case "JOIN_TRECHOS":
      return "unir trechos";
    case "SPATIAL_SEARCH":
      return "busca espacial";
    default:
      return tool;
  }
}

function isPendingFeature(feature: DrawnFeature) {
  return !feature.persistedId;
}

function readStringAttribute(attributes: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = attributes?.[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
}

function PanelSection({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-white p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
export function ProjectMapWorkspace({ project }: ProjectMapWorkspaceProps) {
  const {
    features,
    unsavedCount,
    deletedPersistedIds,
    drawMode,
    setDrawMode,
    workspaceTool,
    setWorkspaceTool,
    snapEnabled,
    setSnapEnabled,
    syncAll,
    setBaseLayersData,
    flyToCity,
    replaceFeatures,
    appendFeatures,
    setActiveProjectId,
    selectedId,
    setSelectedId,
    selectionIds,
    clearSelectionIds,
    pendingFeature,
    cancelPendingFeature,
    confirmPendingFeature,
    updateFeature,
    removeFeature,
    mapStyle,
    setMapStyle,
    layers,
    toggleLayer,
    setLayerAll,
    clearMeasurement,
    measurementPoints,
    spatialSearch,
    setSpatialSearchRadius,
    viewState,
    baseLayersData,
  } = useMapStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AssetDetailRecord | null>(null);
  const [inspectorForm, setInspectorForm] = useState<InspectorFormState>(EMPTY_FORM);
  const [isSavingInspector, setIsSavingInspector] = useState(false);
  const [detailRefreshTick, setDetailRefreshTick] = useState(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const syncDisabled = unsavedCount === 0 || isSyncing;

  useEffect(() => {
    setActiveProjectId(project.id);
    return () => setActiveProjectId(null);
  }, [project.id, setActiveProjectId]);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams({
          limit: "2000",
          projectId: project.id,
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
        const rawFeatures = Array.isArray(gisJson?.data?.features) ? gisJson.data.features : [];
        const parsedFeatures = rawFeatures
          .map((feature: unknown) => toDrawnFeature(feature))
          .filter((feature: DrawnFeature | null): feature is DrawnFeature => feature !== null);

        replaceFeatures(parsedFeatures);

        const normalizedLayers: BaseLayerData[] = Array.isArray(baseJson?.data)
          ? baseJson.data
              .map((layer: unknown) => normalizeBaseLayer(layer))
              .filter((layer: BaseLayerData | null): layer is BaseLayerData => layer !== null)
          : [];

        setBaseLayersData(normalizedLayers);

        const targetLayer =
          normalizedLayers.find((layer) => layer.type === "BOUNDARY") ||
          normalizedLayers.find((layer) => layer.type === "STREETS") ||
          normalizedLayers.find((layer) => layer.type === "STREET_NAMES");

        if (targetLayer?.geoJsonData) {
          const center = getGeoJsonCenter(targetLayer.geoJsonData);
          if (center) flyToCity(center.lng, center.lat, 13);
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
    [assetTypeFilter, flyToCity, project.id, replaceFeatures, setBaseLayersData]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, refreshTick]);

  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedId) ?? null,
    [features, selectedId]
  );

  useEffect(() => {
    const persistedId = selectedFeature?.persistedId ?? null;
    if (!persistedId) {
      setSelectedDetail(null);
      setDetailError(null);
      return;
    }

    const controller = new AbortController();

    const fetchDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const params = new URLSearchParams({ id: persistedId, projectId: project.id });
        const response = await fetch(`/api/gis?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Falha ao carregar o item selecionado (${response.status})`);
        }
        const payload = await response.json();
        setSelectedDetail(payload?.data ?? null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Erro ao carregar detalhe do ativo", error);
        setDetailError(
          error instanceof Error ? error.message : "Falha ao carregar detalhe do item."
        );
        setSelectedDetail(null);
      } finally {
        setDetailLoading(false);
      }
    };

    void fetchDetail();
    return () => controller.abort();
  }, [detailRefreshTick, project.id, refreshTick, selectedFeature?.persistedId]);

  useEffect(() => {
    if (pendingFeature) {
      setInspectorForm({
        name: "",
        description: readStringAttribute(pendingFeature.attributes, ["description", "obs", "notes"]),
        status: readStringAttribute(pendingFeature.attributes, ["status"]),
        front: readStringAttribute(pendingFeature.attributes, ["frente", "area", "fase"]),
        responsible: readStringAttribute(pendingFeature.attributes, ["responsavel", "responsible"]),
        notes: readStringAttribute(pendingFeature.attributes, ["notes", "obs"]),
      });
      return;
    }

    if (selectedFeature) {
      const preferLocalValues = !selectedFeature.synced || !selectedFeature.persistedId;
      const attributes = (selectedFeature.attributes ?? selectedDetail?.attributes ?? {}) as Record<string, unknown>;
      setInspectorForm({
        name: preferLocalValues
          ? selectedFeature.label ?? selectedDetail?.name ?? ""
          : selectedDetail?.name ?? selectedFeature.label ?? "",
        description: preferLocalValues
          ? selectedFeature.description ??
            selectedDetail?.description ??
            readStringAttribute(attributes, ["description", "obs", "notes"])
          : selectedDetail?.description ??
            selectedFeature.description ??
            readStringAttribute(attributes, ["description", "obs", "notes"]),
        status: readStringAttribute(attributes, ["status"]),
        front: readStringAttribute(attributes, ["frente", "area", "fase"]),
        responsible: readStringAttribute(attributes, ["responsavel", "responsible"]),
        notes: readStringAttribute(attributes, ["notes", "obs"]),
      });
      return;
    }

    setInspectorForm(EMPTY_FORM);
  }, [pendingFeature, selectedDetail, selectedFeature]);

  useEffect(() => {
    setCommentDraft("");
    setCommentFiles([]);
  }, [selectedFeature?.id]);

  const filteredFeatures = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return features.filter((feature) => {
      if (pendingOnly && feature.synced) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        feature.label,
        featureTypeLabel(feature.type),
        feature.description,
        ...Object.values(feature.attributes ?? {}).map((value) =>
          typeof value === "string" ? value : JSON.stringify(value)
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [features, pendingOnly, searchQuery]);

  const persistedCount = useMemo(() => features.filter((feature) => feature.persistedId).length, [features]);
  const pendingCount = useMemo(() => features.filter((feature) => !feature.synced).length, [features]);

  const buildPayload = useCallback(
    (feature: DrawnFeature) => {
      const dbType = feature.type === "line" ? "TRECHO" : feature.type === "polygon" ? "AREA" : "PONTO";
      const geomWkt = coordsToWkt(feature);
      if (!geomWkt) throw new Error("Não há geometria válida para sincronizar.");

      const subType = feature.type === "line" || feature.type === "polygon" ? undefined : feature.type;
      const attributes = compactAttributes({
        ...(feature.attributes ?? {}),
        ...(subType ? { subType } : {}),
      });

      return {
        name: feature.label || "Ativo sem nome",
        type: dbType,
        geomWkt,
        projectId: project.id,
        description: feature.description ?? null,
        attributes,
        photos: feature.photos ?? [],
      };
    },
    [project.id]
  );

  const persistFeature = useCallback(
    async (feature: DrawnFeature) => {
      const payload = buildPayload(feature);
      const response = await fetch("/api/gis", {
        method: feature.persistedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feature.persistedId ? { id: feature.persistedId, ...payload } : payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Falha ao persistir item (${response.status})`);
      }

      return response.json().catch(() => null);
    },
    [buildPayload]
  );

  const deletePersistedFeature = useCallback(async (id: string) => {
    const response = await fetch("/api/gis", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || `Falha ao remover item (${response.status})`);
    }
  }, []);

  const handleSync = async () => {
    const visibleUnsaved = features.filter((feature) => !feature.synced);
    if (visibleUnsaved.length === 0 && deletedPersistedIds.length === 0) return;

    setIsSyncing(true);
    try {
      await Promise.all(deletedPersistedIds.map((id) => deletePersistedFeature(id)));
      await Promise.all(visibleUnsaved.map((feature) => persistFeature(feature)));
      syncAll();
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      console.error("Erro ao sincronizar mapa do projeto", error);
      window.alert(
        error instanceof Error ? error.message : "Falha ao sincronizar geometrias."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportGeoJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedFeatures = importGeoJsonFeatures(await file.text(), project.id);
      if (importedFeatures.length === 0) {
        throw new Error("O arquivo não possui geometrias válidas para importação.");
      }

      appendFeatures(importedFeatures);
      setDrawMode("SELECT");
      setWorkspaceTool("SELECT");
      setSelectedId(importedFeatures[0]?.id ?? null);
      clearSelectionIds();
    } catch (error) {
      console.error("Erro ao importar GeoJSON", error);
      window.alert(
        error instanceof Error ? error.message : "Falha ao importar o arquivo GeoJSON."
      );
    } finally {
      event.target.value = "";
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
    anchor.download = `urban-gis-${project.id}.geojson`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleToolbarToolChange = (tool: Parameters<typeof setWorkspaceTool>[0]) => {
    clearSelectionIds();
    setDrawMode("SELECT");
    setWorkspaceTool(tool);
  };

  const handleJoinSelected = () => {
    const selectedLines = selectionIds
      .map((id) => features.find((feature) => feature.id === id) ?? null)
      .filter((feature): feature is DrawnFeature => feature !== null && feature.type === "line");

    if (selectedLines.length !== 2) return;

    const mergedCoords = joinLineFeatures(selectedLines[0], selectedLines[1]);
    if (!mergedCoords) {
      window.alert("Os trechos selecionados não compartilham extremidades compatíveis para união.");
      return;
    }

    updateFeature(selectedLines[0].id, { coords: mergedCoords, synced: false });
    removeFeature(selectedLines[1].id);
    clearSelectionIds();
    setSelectedId(selectedLines[0].id);
    setWorkspaceTool("SELECT");
  };

  const handleFocusFeature = (feature: DrawnFeature) => {
    setSelectedId(feature.id);
    const anchor = feature.coords[0];
    if (anchor) {
      flyToCity(anchor.lng, anchor.lat, feature.type === "line" || feature.type === "polygon" ? 15 : 17);
    }
  };

  const handleInspectorSave = async () => {
    if (pendingFeature) {
      confirmPendingFeature(
        compactAttributes({
          status: inspectorForm.status,
          frente: inspectorForm.front,
          responsavel: inspectorForm.responsible,
          notes: inspectorForm.notes,
          description: inspectorForm.description,
        }),
        inspectorForm.name.trim() || undefined
      );
      return;
    }

    if (!selectedFeature) return;

    const nextAttributes = compactAttributes({
      ...(selectedFeature.attributes ?? {}),
      status: inspectorForm.status,
      frente: inspectorForm.front,
      responsavel: inspectorForm.responsible,
      notes: inspectorForm.notes,
      description: inspectorForm.description,
    });

    const nextFeature: DrawnFeature = {
      ...selectedFeature,
      label: inspectorForm.name.trim() || selectedFeature.label || "Ativo sem nome",
      description: inspectorForm.description.trim() || null,
      attributes: nextAttributes,
    };

    if (!selectedFeature.persistedId) {
      updateFeature(selectedFeature.id, {
        label: nextFeature.label,
        description: nextFeature.description,
        attributes: nextAttributes,
      });
      return;
    }

    setIsSavingInspector(true);
    try {
      await persistFeature(nextFeature);
      updateFeature(selectedFeature.id, {
        label: nextFeature.label,
        description: nextFeature.description,
        attributes: nextAttributes,
        synced: true,
      });
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      console.error("Erro ao salvar item selecionado", error);
      window.alert(
        error instanceof Error ? error.message : "Falha ao salvar o item selecionado."
      );
    } finally {
      setIsSavingInspector(false);
    }
  };

  const handleCreateComment = async () => {
    if (!selectedFeature?.persistedId) return;

    const trimmedNote = commentDraft.trim();
    if (!trimmedNote && commentFiles.length === 0) {
      window.alert("Adicione um comentário ou ao menos um anexo antes de publicar.");
      return;
    }

    setIsSubmittingComment(true);
    try {
      let uploadedPhotos: string[] = [];

      if (commentFiles.length > 0) {
        const formData = new FormData();
        formData.append("module", "gis");
        commentFiles.forEach((file) => formData.append("files", file));

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const body = await uploadResponse.json().catch(() => null);
          throw new Error(body?.error || `Falha ao enviar anexos (${uploadResponse.status})`);
        }

        const uploadPayload = await uploadResponse.json().catch(() => null);
        uploadedPhotos = Array.isArray(uploadPayload?.urls)
          ? uploadPayload.urls.filter((value: unknown): value is string => typeof value === "string")
          : [];
      }

      const anchor = selectedFeature.coords[0] ?? null;
      const response = await fetch(`/api/gis/${selectedFeature.persistedId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: trimmedNote || "Anexo adicionado ao item.",
          photos: uploadedPhotos,
          lat: anchor?.lat ?? null,
          lng: anchor?.lng ?? null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Falha ao registrar comentário (${response.status})`);
      }

      setCommentDraft("");
      setCommentFiles([]);
      setDetailRefreshTick((tick) => tick + 1);
    } catch (error) {
      console.error("Erro ao publicar comentário do item", error);
      window.alert(
        error instanceof Error ? error.message : "Falha ao registrar comentário no item."
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const selectedPhotos = useMemo(() => {
    const photoSet = new Set<string>();
    selectedDetail?.photos?.forEach((photo) => photoSet.add(photo));
    selectedFeature?.photos?.forEach((photo) => photoSet.add(photo));
    normalizePhotoList(selectedFeature?.attributes?.photos).forEach((photo) => photoSet.add(photo));
    selectedDetail?.logs?.forEach((log) => {
      log.photos.forEach((photo) => photoSet.add(photo));
    });
    return Array.from(photoSet);
  }, [selectedDetail, selectedFeature]);

  const measurementLabel = useMemo(() => {
    if (workspaceTool === "MEASURE_DISTANCE" && measurementPoints.length >= 2) {
      return `Distância ${formatDistance(measureDistance(measurementPoints))}`;
    }

    if (workspaceTool === "MEASURE_AREA" && measurementPoints.length >= 3) {
      return `Área ${formatArea(measureArea(measurementPoints))}`;
    }

    return null;
  }, [measurementPoints, workspaceTool]);

  const canJoinSelected = useMemo(() => {
    const selectedLines = selectionIds
      .map((id) => features.find((feature) => feature.id === id) ?? null)
      .filter((feature): feature is DrawnFeature => feature !== null && feature.type === "line");

    if (selectedLines.length !== 2) return false;
    return Boolean(joinLineFeatures(selectedLines[0], selectedLines[1]));
  }, [features, selectionIds]);

  const statusBarMetric = useMemo(() => {
    if (!selectedFeature) return null;
    return {
      label:
        selectedFeature.type === "line"
          ? "Comprimento"
          : selectedFeature.type === "polygon"
            ? "Área"
            : "Coordenada",
      value: featureMetricLabel(selectedFeature),
    };
  }, [selectedFeature]);

  return (
    <div className="overflow-hidden rounded-[30px] border border-border bg-slate-50 shadow-card">
      <input
        ref={importInputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        onChange={handleImportGeoJson}
      />

      <header className="border-b border-border bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-brand-600">
              Workspace cartográfico do projeto
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="truncate font-display text-2xl font-800 text-foreground">
                {project.code ? `${project.code} · ${project.name}` : project.name}
              </h2>
              <ProjectBadge label={getProjectStatusLabel(project.status)} tone="brand" />
              <ProjectBadge
                label={getProjectOperationalStatusLabel(project.operationalStatus)}
                tone="neutral"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.responsibleDepartment || "Secretaria não informada"}
              {project.neighborhood || project.region
                ? ` · ${[project.neighborhood, project.region].filter(Boolean).join(" · ")}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/projetos/${project.id}`}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Voltar à ficha
            </Link>
            <Link
              href={`/app/projetos/${project.id}/fiscalizacao`}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Fiscalização
            </Link>
            <button
              onClick={() => setRefreshTick((tick) => tick + 1)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Recarregar
            </button>
            <button
              onClick={handleExportGeoJson}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Exportar GeoJSON
            </button>
            <button
              onClick={handleSync}
              disabled={syncDisabled}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
                syncDisabled ? "cursor-not-allowed bg-slate-400" : "bg-brand-600 hover:bg-brand-500"
              )}
            >
              {isSyncing ? "Sincronizando..." : `Salvar alterações${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ProjectBadge label={`${formatNumber(persistedCount)} item(ns) no mapa`} tone="neutral" />
          <ProjectBadge label={`${formatNumber(baseLayersData.length)} baselayer(s)`} tone="neutral" />
          <ProjectBadge label={`${formatNumber(project._count.documents)} documento(s)`} tone="success" />
          <ProjectBadge label={`${formatNumber(project._count.measurements)} medição(ões)`} tone="warning" />
          {project.technicalAreas.slice(0, 4).map((area) => (
            <ProjectBadge key={area} label={getProjectTechnicalAreaLabel(area)} tone="brand" />
          ))}
        </div>
      </header>

      <ProjectMapGlobalToolbar
        activeTool={workspaceTool}
        onToolChange={handleToolbarToolChange}
        snapEnabled={snapEnabled}
        onSnapChange={setSnapEnabled}
        measurementLabel={measurementLabel}
        onClearMeasurement={clearMeasurement}
        spatialSearchRadius={spatialSearch.radiusMeters}
        onSpatialSearchRadiusChange={setSpatialSearchRadius}
        onImportClick={() => importInputRef.current?.click()}
        onExportClick={handleExportGeoJson}
        onJoinSelected={handleJoinSelected}
        canJoinSelected={canJoinSelected}
      />

      <div className="grid h-[calc(100vh-15.5rem)] min-h-[820px] grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="border-r border-border bg-white">
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <PanelSection title="Camadas e filtros" eyebrow="Controle visual">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Estilo de base
                    </label>
                    <button
                      onClick={() => setLayerAll(true)}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-500"
                    >
                      Ligar tudo
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {MAP_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setMapStyle(style.id)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-colors",
                          mapStyle === style.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        )}
                      >
                        <p className="text-sm font-semibold">{style.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{style.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Visibilidade
                    </label>
                    <button
                      onClick={() => setLayerAll(!Object.values(layers).every(Boolean))}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-500"
                    >
                      {Object.values(layers).every(Boolean) ? "Ocultar tudo" : "Mostrar tudo"}
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {LAYER_DEFS.map((layer) => (
                      <button
                        key={layer.key}
                        onClick={() => toggleLayer(layer.key)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                          layers[layer.key]
                            ? "border-border bg-background"
                            : "border-border/60 bg-slate-50 text-muted-foreground"
                        )}
                      >
                        <span className={cn("h-3 w-3 rounded-full", layer.tone)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{layer.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{layer.description}</p>
                        </div>
                        <ProjectBadge
                          label={layers[layer.key] ? "Ativa" : "Oculta"}
                          tone={layers[layer.key] ? "success" : "neutral"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Filtro principal de carga
                  </label>
                  <select
                    value={assetTypeFilter}
                    onChange={(event) => setAssetTypeFilter(event.target.value as AssetTypeFilter)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500"
                  >
                    <option value="ALL">Todos os tipos</option>
                    <option value="PONTO">Somente pontos</option>
                    <option value="TRECHO">Somente trechos</option>
                    <option value="AREA">Somente áreas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Busca local
                  </label>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Nome, tipo, frente, responsável..."
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500"
                  />
                </div>

                <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3 text-sm">
                  <span className="font-medium text-foreground">Mostrar apenas pendentes locais</span>
                  <input
                    type="checkbox"
                    checked={pendingOnly}
                    onChange={(event) => setPendingOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </PanelSection>

            <PanelSection title="Ferramentas" eyebrow="Desenho e operação">
              <div className="space-y-4">
                {TOOL_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="mt-2 grid gap-2">
                      {group.items.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            clearSelectionIds();
                            clearMeasurement();
                            setWorkspaceTool("SELECT");
                            setDrawMode(tool.id);
                          }}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition-colors",
                            drawMode === tool.id
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">{tool.label}</span>
                            {drawMode === tool.id ? <ProjectBadge label="Ativo" tone="brand" /> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{tool.helper}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PanelSection>

            <PanelSection
              title="Navegador de itens"
              eyebrow="Camadas operacionais"
              action={
                <span className="text-xs font-medium text-muted-foreground">
                  {formatNumber(filteredFeatures.length)} visível(is)
                </span>
              }
            >
              {filteredFeatures.length > 0 ? (
                <div className="space-y-2">
                  {filteredFeatures.slice(0, 40).map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => handleFocusFeature(feature)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                        selectedId === feature.id
                          ? "border-brand-500 bg-brand-50"
                          : selectionIds.includes(feature.id)
                            ? "border-emerald-500 bg-emerald-50"
                            : spatialSearch.resultIds.includes(feature.id)
                              ? "border-sky-500 bg-sky-50"
                              : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {feature.label || featureTypeLabel(feature.type)}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {featureTypeLabel(feature.type)} · {geometrySummary(feature)}
                          </p>
                        </div>
                        <ProjectBadge
                          label={
                            selectionIds.includes(feature.id)
                              ? "Seleção"
                              : spatialSearch.resultIds.includes(feature.id)
                                ? "Raio"
                                : isPendingFeature(feature)
                                  ? "Local"
                                  : feature.synced
                                    ? "Base"
                                    : "Editar"
                          }
                          tone={
                            selectionIds.includes(feature.id)
                              ? "success"
                              : spatialSearch.resultIds.includes(feature.id)
                                ? "brand"
                                : isPendingFeature(feature)
                                  ? "warning"
                                  : feature.synced
                                    ? "success"
                                    : "brand"
                          }
                        />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <ProjectEmptyBlock
                  title="Nada encontrado"
                  description="Ajuste o filtro principal ou a busca local para localizar itens no mapa deste projeto."
                />
              )}
            </PanelSection>
          </div>
        </aside>

        <section className="min-w-0 bg-slate-100 p-4">
          <div className="relative h-full overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            {isLoading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
                <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Workspace técnico</p>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando ativos, baselayers e contexto do projeto...</p>
                </div>
              </div>
            ) : null}

            {loadError ? (
              <div className="absolute left-4 top-4 z-20 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 shadow-sm">
                {loadError}
              </div>
            ) : null}

            <MapCanvas
              className="h-full"
              showEngineeringPanel={false}
              showSelectionOverlay={false}
              showFullscreenButton={false}
              showDrawHint={false}
            />
          </div>
        </section>

        <aside className="border-l border-border bg-white">
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <PanelSection title="Inspector técnico" eyebrow="Item selecionado">
              {pendingFeature ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    Novo item pronto para cadastro local. Preencha os dados técnicos antes de continuar a edição no mapa.
                  </div>
                  <div className="grid gap-3">
                    <input value={inspectorForm.name} onChange={(event) => setInspectorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome técnico do item" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <textarea value={inspectorForm.description} onChange={(event) => setInspectorForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição ou escopo técnico" rows={3} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <input value={inspectorForm.status} onChange={(event) => setInspectorForm((current) => ({ ...current, status: event.target.value }))} placeholder="Status técnico" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <input value={inspectorForm.front} onChange={(event) => setInspectorForm((current) => ({ ...current, front: event.target.value }))} placeholder="Frente, fase ou área" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <input value={inspectorForm.responsible} onChange={(event) => setInspectorForm((current) => ({ ...current, responsible: event.target.value }))} placeholder="Responsável técnico" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <textarea value={inspectorForm.notes} onChange={(event) => setInspectorForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Observações operacionais" rows={4} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={cancelPendingFeature} className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">Cancelar</button>
                    <button onClick={handleInspectorSave} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">Adicionar ao workspace</button>
                  </div>
                </div>
              ) : selectedFeature ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <ProjectBadge label={featureTypeLabel(selectedFeature.type)} tone="neutral" />
                    <ProjectBadge label={selectedFeature.synced ? "Na base" : selectedFeature.persistedId ? "Edição pendente" : "Rascunho local"} tone={selectedFeature.synced ? "success" : selectedFeature.persistedId ? "brand" : "warning"} />
                    <ProjectBadge label={featureMetricLabel(selectedFeature)} tone="brand" />
                  </div>

                  <div className="grid gap-3">
                    <input value={inspectorForm.name} onChange={(event) => setInspectorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do item" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <textarea value={inspectorForm.description} onChange={(event) => setInspectorForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição técnica" rows={3} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <input value={inspectorForm.status} onChange={(event) => setInspectorForm((current) => ({ ...current, status: event.target.value }))} placeholder="Status técnico" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <input value={inspectorForm.front} onChange={(event) => setInspectorForm((current) => ({ ...current, front: event.target.value }))} placeholder="Frente, fase ou área" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <input value={inspectorForm.responsible} onChange={(event) => setInspectorForm((current) => ({ ...current, responsible: event.target.value }))} placeholder="Responsável técnico" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                    <textarea value={inspectorForm.notes} onChange={(event) => setInspectorForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Observações operacionais" rows={4} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setSelectedId(null)} className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">Fechar</button>
                    <button onClick={handleInspectorSave} disabled={isSavingInspector} className={cn("flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white", isSavingInspector ? "bg-slate-400" : "bg-brand-600 hover:bg-brand-500")}>{isSavingInspector ? "Salvando..." : selectedFeature.persistedId ? "Salvar no banco" : "Salvar local"}</button>
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Propriedades</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Geometria</dt><dd className="font-medium text-foreground">{geometrySummary(selectedFeature)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Atualização</dt><dd className="font-medium text-foreground">{selectedDetail?.updatedAt ? formatDateTime(selectedDetail.updatedAt) : selectedFeature.updatedAt ? formatDateTime(selectedFeature.updatedAt) : "Local"}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Problemas ligados</dt><dd className="font-medium text-foreground">{selectedDetail ? formatNumber(selectedDetail._count.issues) : "-"}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Projeto</dt><dd className="font-medium text-foreground">{selectedDetail?.project?.name || project.name}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Anexos e comentários</p>
                    {selectedFeature.persistedId ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="Registrar observação, evidência de campo ou atualização do item..."
                          rows={4}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                        />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          multiple
                          onChange={(event) =>
                            setCommentFiles(Array.from(event.target.files ?? []))
                          }
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-foreground"
                        />
                        {commentFiles.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(commentFiles.length)} arquivo(s) pronto(s) para upload.
                          </p>
                        ) : null}
                        <button
                          onClick={handleCreateComment}
                          disabled={isSubmittingComment}
                          className={cn(
                            "w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
                            isSubmittingComment ? "bg-slate-400" : "bg-brand-600 hover:bg-brand-500"
                          )}
                        >
                          {isSubmittingComment ? "Publicando..." : "Publicar comentário"}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Comentários, anexos e histórico detalhado ficam disponíveis após salvar o item na base.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Anexos</p>
                    {selectedPhotos.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {selectedPhotos.slice(0, 6).map((photo) => (
                          <a
                            key={photo}
                            href={photo}
                            target="_blank"
                            rel="noreferrer"
                            className="overflow-hidden rounded-xl border border-border bg-slate-100"
                          >
                            <div
                              aria-label="Anexo do ativo"
                              className="h-28 w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${photo})` }}
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">Este item ainda não possui anexos vinculados.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Histórico do item</p>
                    {detailLoading ? <p className="mt-3 text-sm text-muted-foreground">Carregando histórico...</p> : null}
                    {detailError ? <p className="mt-3 text-sm text-danger-600">{detailError}</p> : null}
                    {selectedDetail?.logs?.length ? (
                      <div className="mt-3 space-y-3">
                        {selectedDetail.logs.map((log) => (
                          <div key={log.id} className="rounded-xl border border-border px-3 py-3">
                            <p className="text-sm font-medium text-foreground">{log.note}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.createdAt)} · {log.user?.name || log.user?.email || "Usuário"}</p>
                            {log.photos.length > 0 ? (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {log.photos.slice(0, 4).map((photo) => (
                                  <a
                                    key={photo}
                                    href={photo}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="overflow-hidden rounded-lg border border-border bg-slate-100"
                                  >
                                    <div
                                      aria-label="Anexo do histórico"
                                      className="h-20 w-full bg-cover bg-center"
                                      style={{ backgroundImage: `url(${photo})` }}
                                    />
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : !detailLoading ? (
                      <p className="mt-3 text-sm text-muted-foreground">Nenhum histórico operacional vinculado a este item.</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <ProjectEmptyBlock title="Selecione ou desenhe um item" description="Use o painel esquerdo para localizar itens existentes, desenhar novos ativos ou editar geometrias já publicadas no projeto." />
              )}
            </PanelSection>
          </div>
        </aside>
      </div>

      <footer className="border-t border-slate-800 bg-slate-950 px-5 py-3 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span>Centro {formatCoords(viewState.latitude, viewState.longitude)}</span>
            <span>Zoom {viewState.zoom.toFixed(2)}</span>
            <span>{Object.values(layers).filter(Boolean).length} camada(s) ativas</span>
            <span>{formatNumber(features.length)} item(ns) carregados</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span>
              Modo{" "}
              {drawMode === "SELECT"
                ? workspaceToolLabel(workspaceTool)
                : `desenho · ${featureTypeLabel(drawMode as DrawnFeature["type"])}`}
            </span>
            {spatialSearch.resultIds.length > 0 ? (
              <span>{formatNumber(spatialSearch.resultIds.length)} resultado(s) no raio</span>
            ) : null}
            {statusBarMetric ? <span>{statusBarMetric.label}: {statusBarMetric.value}</span> : null}
            {pendingCount > 0 ? <span>{pendingCount} alteração(ões) pendente(s)</span> : <span>Sem pendências locais</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
