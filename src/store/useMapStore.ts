import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  getTechnicalObjectDefinition,
  type ProjectDisciplineId,
  type TechnicalObjectTypeId,
} from "@/lib/project-disciplines";

export type AssetCategory = TechnicalObjectTypeId;

export type DrawMode = "SELECT" | "line" | "polygon" | AssetCategory;
export type MapStyle = "gis" | "satellite" | "topography" | "dark";
export type WorkspaceTool =
  | "SELECT"
  | "EDIT_GEOMETRY"
  | "MOVE"
  | "MEASURE_DISTANCE"
  | "MEASURE_AREA"
  | "SPLIT_TRECHO"
  | "JOIN_TRECHOS"
  | "SPATIAL_SEARCH";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DrawnFeature {
  id: string;
  persistedId?: string | null;
  type: "line" | "polygon" | AssetCategory;
  coords: GeoPoint[];
  label?: string;
  projectId?: string;
  color?: string;
  description?: string | null;
  photos?: string[];
  updatedAt?: string;
  createdAtIso?: string;
  synced: boolean;
  createdAt: number;
  attributes?: Record<string, any>;
}

export interface BaseLayerData {
  id: string;
  name: string;
  type: "BOUNDARY" | "STREETS" | "STREET_NAMES";
  geoJsonData: any;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  transitionDuration?: number;
}

export interface LayerVisibility {
  basegis: boolean;
  ativos: boolean;
  obras: boolean;
  alertas: boolean;
  viario: boolean;
  topografia: boolean;
}

export interface SpatialSearchState {
  center: GeoPoint | null;
  radiusMeters: number;
  resultIds: string[];
}

interface MapStore {
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  workspaceTool: WorkspaceTool;
  setWorkspaceTool: (tool: WorkspaceTool) => void;

  drawMode: DrawMode;
  setDrawMode: (mode: DrawMode) => void;

  activeTechnicalArea: ProjectDisciplineId | null;
  setActiveTechnicalArea: (area: ProjectDisciplineId | null) => void;

  activeTechnicalObjectType: TechnicalObjectTypeId | null;
  setActiveTechnicalObjectType: (objectType: TechnicalObjectTypeId | null) => void;

  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;

  pendingFeature: Omit<DrawnFeature, "id" | "createdAt" | "synced"> | null;
  cancelPendingFeature: () => void;
  confirmPendingFeature: (attributes: Record<string, any>, label?: string) => void;

  unsavedCount: number;
  incrementUnsaved: () => void;
  resetUnsaved: () => void;

  features: DrawnFeature[];
  appendFeatures: (features: DrawnFeature[]) => void;
  replaceFeatures: (features: DrawnFeature[]) => void;
  updateFeature: (id: string, data: Partial<DrawnFeature>) => void;
  removeFeature: (id: string) => void;
  clearFeatures: () => void;
  syncAll: () => void;
  deletedPersistedIds: string[];
  clearDeletedPersistedIds: () => void;

  baseLayersData: BaseLayerData[];
  setBaseLayersData: (layers: BaseLayerData[]) => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectionIds: string[];
  setSelectionIds: (ids: string[]) => void;
  toggleSelectionId: (id: string) => void;
  clearSelectionIds: () => void;

  draftPoints: GeoPoint[];
  addDraftPoint: (point: GeoPoint) => void;
  clearDraftPoints: () => void;
  finishDraft: () => void;

  measurementPoints: GeoPoint[];
  addMeasurementPoint: (point: GeoPoint) => void;
  clearMeasurement: () => void;

  spatialSearch: SpatialSearchState;
  setSpatialSearchRadius: (radiusMeters: number) => void;
  setSpatialSearchResult: (center: GeoPoint | null, resultIds: string[]) => void;
  clearSpatialSearch: () => void;

  viewState: MapViewState;
  setViewState: (vs: MapViewState) => void;
  flyToCity: (lng: number, lat: number, zoom?: number) => void;

  layers: LayerVisibility;
  toggleLayer: (key: keyof LayerVisibility) => void;
  setLayerAll: (visible: boolean) => void;

  mapStyle: MapStyle;
  setMapStyle: (style: MapStyle) => void;

  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

function deriveDescription(attributes: Record<string, any>) {
  if (typeof attributes.description === "string") return attributes.description;
  if (typeof attributes.obs === "string") return attributes.obs;
  if (typeof attributes.notes === "string") return attributes.notes;
  return null;
}

function derivePhotos(attributes: Record<string, any>) {
  if (!Array.isArray(attributes.photos)) return [];
  return attributes.photos.filter((item: unknown): item is string => typeof item === "string");
}

function buildPendingTechnicalAttributes(
  technicalArea: ProjectDisciplineId | null,
  technicalObjectType: TechnicalObjectTypeId | null
) {
  const attributes: Record<string, unknown> = {};

  if (technicalArea) attributes.technicalArea = technicalArea;
  if (technicalObjectType) {
    attributes.technicalObjectType = technicalObjectType;
    attributes.subType = technicalObjectType;
  }

  return attributes;
}

export const useMapStore = create<MapStore>()(
  devtools(
    (set, get) => ({
      isFullscreen: false,
      toggleFullscreen: () => {
        const doc = window.document;
        const docEl = doc.documentElement;
        const isFull = get().isFullscreen;

        if (!isFull) docEl.requestFullscreen?.();
        else doc.exitFullscreen?.();

        set({ isFullscreen: !isFull });
      },

      workspaceTool: "SELECT",
      setWorkspaceTool: (tool) =>
        set((state) => ({
          workspaceTool: tool,
          measurementPoints:
            tool === "MEASURE_DISTANCE" || tool === "MEASURE_AREA"
              ? state.measurementPoints
              : [],
          selectionIds: tool === "JOIN_TRECHOS" ? state.selectionIds : [],
          spatialSearch:
            tool === "SPATIAL_SEARCH"
              ? state.spatialSearch
              : {
                  ...state.spatialSearch,
                  center: null,
                  resultIds: [],
                },
        })),

      drawMode: "SELECT",
      setDrawMode: (mode) =>
        set((state) => {
          if (mode !== "SELECT" && mode !== "line" && mode !== "polygon") {
            const objectDefinition = getTechnicalObjectDefinition(mode);
            return {
              drawMode: mode,
              draftPoints: [],
              activeTechnicalObjectType: mode,
              activeTechnicalArea: objectDefinition?.area ?? state.activeTechnicalArea,
            };
          }

          return {
            drawMode: mode,
            draftPoints: [],
          };
        }),

      activeTechnicalArea: null,
      setActiveTechnicalArea: (area) =>
        set((state) => ({
          activeTechnicalArea: area,
          activeTechnicalObjectType:
            state.activeTechnicalObjectType &&
            getTechnicalObjectDefinition(state.activeTechnicalObjectType)?.area !== area
              ? null
              : state.activeTechnicalObjectType,
        })),

      activeTechnicalObjectType: null,
      setActiveTechnicalObjectType: (objectType) =>
        set((state) => ({
          activeTechnicalObjectType: objectType,
          activeTechnicalArea:
            objectType !== null
              ? getTechnicalObjectDefinition(objectType)?.area ?? state.activeTechnicalArea
              : state.activeTechnicalArea,
        })),

      snapEnabled: true,
      setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),

      pendingFeature: null,
      cancelPendingFeature: () => set({ pendingFeature: null, drawMode: "SELECT" }),

      confirmPendingFeature: (attributes, label) => {
        const {
          pendingFeature,
          features,
          unsavedCount,
          activeTechnicalArea,
          activeTechnicalObjectType,
        } = get();
        if (!pendingFeature) return;

        const newFeature: DrawnFeature = {
          ...pendingFeature,
          label: label || pendingFeature.label,
          description: deriveDescription(attributes),
          photos: derivePhotos(attributes),
          attributes: {
            ...buildPendingTechnicalAttributes(activeTechnicalArea, activeTechnicalObjectType),
            ...attributes,
          },
          synced: false,
          id: `feat-${crypto.randomUUID()}`,
          createdAt: Date.now(),
        };

        set({
          features: [...features, newFeature],
          unsavedCount: unsavedCount + 1,
          pendingFeature: null,
          drawMode: "SELECT",
        });
      },

      unsavedCount: 0,
      incrementUnsaved: () => set((state) => ({ unsavedCount: state.unsavedCount + 1 })),
      resetUnsaved: () => set({ unsavedCount: 0 }),

      features: [],
      appendFeatures: (features) =>
        set((state) => ({
          features: [...state.features, ...features],
          unsavedCount:
            state.unsavedCount +
            features.filter((feature) => !feature.synced || !feature.persistedId).length,
        })),
      replaceFeatures: (features) =>
        set((state) => ({
          features,
          unsavedCount: 0,
          deletedPersistedIds: [],
          selectedId: null,
          selectionIds: [],
          draftPoints: [],
          measurementPoints: [],
          pendingFeature: null,
          spatialSearch: {
            ...state.spatialSearch,
            center: null,
            resultIds: [],
          },
        })),
      updateFeature: (id, data) =>
        set((state) => ({
          features: state.features.map((feature) =>
            feature.id === id ? { ...feature, ...data } : feature
          ),
          unsavedCount: state.unsavedCount + 1,
        })),
      removeFeature: (id) =>
        set((state) => {
          const removed = state.features.find((feature) => feature.id === id) ?? null;
          return {
            features: state.features.filter((feature) => feature.id !== id),
            selectedId: state.selectedId === id ? null : state.selectedId,
            selectionIds: state.selectionIds.filter((entry) => entry !== id),
            spatialSearch: {
              ...state.spatialSearch,
              resultIds: state.spatialSearch.resultIds.filter((entry) => entry !== id),
            },
            unsavedCount: state.unsavedCount + 1,
            deletedPersistedIds:
              removed?.persistedId && !state.deletedPersistedIds.includes(removed.persistedId)
                ? [...state.deletedPersistedIds, removed.persistedId]
                : state.deletedPersistedIds,
          };
        }),
      clearFeatures: () =>
        set((state) => ({
          deletedPersistedIds: [
            ...state.deletedPersistedIds,
            ...state.features
              .map((feature) => feature.persistedId)
              .filter((value): value is string => Boolean(value))
              .filter((value) => !state.deletedPersistedIds.includes(value)),
          ],
          features: [],
          selectedId: null,
          selectionIds: [],
          draftPoints: [],
          measurementPoints: [],
          pendingFeature: null,
        })),
      syncAll: () =>
        set((state) => ({
          features: state.features.map((feature) => ({ ...feature, synced: true })),
          unsavedCount: 0,
          deletedPersistedIds: [],
        })),
      deletedPersistedIds: [],
      clearDeletedPersistedIds: () => set({ deletedPersistedIds: [] }),

      baseLayersData: [],
      setBaseLayersData: (layers) => set({ baseLayersData: layers }),

      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),
      selectionIds: [],
      setSelectionIds: (ids) => set({ selectionIds: Array.from(new Set(ids)) }),
      toggleSelectionId: (id) =>
        set((state) => ({
          selectionIds: state.selectionIds.includes(id)
            ? state.selectionIds.filter((entry) => entry !== id)
            : [...state.selectionIds, id],
        })),
      clearSelectionIds: () => set({ selectionIds: [] }),

      draftPoints: [],
      addDraftPoint: (point) => {
        const {
          drawMode,
          draftPoints,
          activeTechnicalArea,
          activeTechnicalObjectType,
        } = get();
        if (drawMode !== "SELECT" && drawMode !== "line" && drawMode !== "polygon") {
          set({
            pendingFeature: {
              type: drawMode,
              coords: [point],
              attributes: buildPendingTechnicalAttributes(activeTechnicalArea, drawMode),
            },
          });
          return;
        }
        set({ draftPoints: [...draftPoints, point] });
      },
      finishDraft: () => {
        const {
          drawMode,
          draftPoints,
          activeTechnicalArea,
          activeTechnicalObjectType,
        } = get();
        const minPoints = drawMode === "polygon" ? 3 : 2;
        if (draftPoints.length >= minPoints && (drawMode === "line" || drawMode === "polygon")) {
          set({
            pendingFeature: {
              type: drawMode,
              coords: draftPoints,
              color: "#3b82f6",
              attributes: buildPendingTechnicalAttributes(
                activeTechnicalArea,
                activeTechnicalObjectType
              ),
            },
            draftPoints: [],
          });
        } else {
          set({ draftPoints: [], drawMode: "SELECT" });
        }
      },
      clearDraftPoints: () => set({ draftPoints: [] }),

      measurementPoints: [],
      addMeasurementPoint: (point) =>
        set((state) => ({ measurementPoints: [...state.measurementPoints, point] })),
      clearMeasurement: () => set({ measurementPoints: [] }),

      spatialSearch: {
        center: null,
        radiusMeters: 30,
        resultIds: [],
      },
      setSpatialSearchRadius: (radiusMeters) =>
        set((state) => ({
          spatialSearch: {
            ...state.spatialSearch,
            radiusMeters,
          },
        })),
      setSpatialSearchResult: (center, resultIds) =>
        set((state) => ({
          spatialSearch: {
            ...state.spatialSearch,
            center,
            resultIds,
          },
        })),
      clearSpatialSearch: () =>
        set((state) => ({
          spatialSearch: {
            ...state.spatialSearch,
            center: null,
            resultIds: [],
          },
        })),

      viewState: {
        longitude: -38.5267,
        latitude: -3.7319,
        zoom: 12,
        bearing: 0,
        pitch: 0,
      },
      setViewState: (vs) => set({ viewState: vs }),
      flyToCity: (lng, lat, zoom = 14) =>
        set((state) => ({
          viewState: {
            ...state.viewState,
            longitude: lng,
            latitude: lat,
            zoom,
            transitionDuration: 2000,
          },
        })),

      layers: {
        basegis: true,
        ativos: true,
        obras: true,
        alertas: true,
        viario: true,
        topografia: false,
      },
      toggleLayer: (key) =>
        set((state) => ({ layers: { ...state.layers, [key]: !state.layers[key] } })),
      setLayerAll: (visible) =>
        set({
          layers: {
            basegis: visible,
            ativos: visible,
            obras: visible,
            alertas: visible,
            viario: visible,
            topografia: visible,
          },
        }),

      mapStyle: "gis",
      setMapStyle: (style) => set({ mapStyle: style }),

      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    { name: "UrbanDesk · MapStore" }
  )
);

export const selectDrawMode = (state: MapStore) => state.drawMode;
export const selectFeatures = (state: MapStore) => state.features;
export const selectLayers = (state: MapStore) => state.layers;
export const selectViewState = (state: MapStore) => state.viewState;
export const selectDraftPoints = (state: MapStore) => state.draftPoints;
export const selectUnsavedCount = (state: MapStore) => state.unsavedCount;
export const selectPendingFeature = (state: MapStore) => state.pendingFeature;
