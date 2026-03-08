import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type AssetCategory = 
  | "BOCA_LOBO" | "POCO_VISITA" | "HIDRANTE" 
  | "SEMAFORO" | "PLACA_TRANSITO" | "LOMBADA" | "PONTO_ONIBUS" | "RADAR"
  | "POSTE_LUZ" | "ARVORE" | "LIXEIRA" | "BURACO";

export type DrawMode = "SELECT" | "line" | "polygon" | AssetCategory;
export type MapStyle = "gis" | "satellite" | "topography" | "dark";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DrawnFeature {
  id:         string;
  type:       "line" | "polygon" | AssetCategory;
  coords:     GeoPoint[];
  label?:     string;
  projectId?: string;
  color?:     string;
  synced:     boolean; 
  createdAt:  number;
  attributes?: Record<string, any>; 
}

// 🚀 OBRIGATÓRIO: Tipagem dos Shapefiles
export interface BaseLayerData {
  id: string;
  name: string;
  type: "BOUNDARY" | "STREETS" | "STREET_NAMES";
  geoJsonData: any;
}

export interface MapViewState {
  longitude: number;
  latitude:  number;
  zoom:      number;
  bearing?:  number;
  pitch?:    number;
}

export interface LayerVisibility {
  basegis:    boolean; // 🚀 NOVO: Controle dos Shapefiles
  ativos:     boolean;
  obras:      boolean;
  alertas:    boolean;
  viario:     boolean;
  topografia: boolean;
}

interface MapStore {
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  drawMode:    DrawMode;
  setDrawMode: (mode: DrawMode) => void;

  pendingFeature: Omit<DrawnFeature, "id" | "createdAt" | "synced"> | null;
  cancelPendingFeature: () => void;
  confirmPendingFeature: (attributes: Record<string, any>, label?: string) => void;

  unsavedCount: number;
  incrementUnsaved: () => void;
  resetUnsaved: () => void;

  features:      DrawnFeature[];
  updateFeature: (id: string, data: Partial<DrawnFeature>) => void;
  removeFeature: (id: string) => void;
  clearFeatures: () => void;
  syncAll:       () => void; 

  // 🚀 OBRIGATÓRIO: Estado para guardar os Shapefiles do BD
  baseLayersData: BaseLayerData[];
  setBaseLayersData: (layers: BaseLayerData[]) => void;

  selectedId:    string | null;
  setSelectedId: (id: string | null) => void;

  draftPoints:      GeoPoint[];
  addDraftPoint:    (point: GeoPoint) => void;
  clearDraftPoints: () => void;
  finishDraft:      () => void; 

  viewState:    MapViewState;
  setViewState: (vs: MapViewState) => void;
  flyToCity:    (lng: number, lat: number, zoom?: number) => void;

  layers:      LayerVisibility;
  toggleLayer: (key: keyof LayerVisibility) => void;
  setLayerAll: (visible: boolean) => void;

  mapStyle:    MapStyle;
  setMapStyle: (style: MapStyle) => void;

  activeProjectId:    string | null;
  setActiveProjectId: (id: string | null) => void;
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

      drawMode: "SELECT",
      setDrawMode: (mode) => set({ drawMode: mode, draftPoints: [] }),

      pendingFeature: null,
      cancelPendingFeature: () => set({ pendingFeature: null, drawMode: "SELECT" }),
      
      confirmPendingFeature: (attributes, label) => {
        const { pendingFeature, features, unsavedCount } = get();
        if (!pendingFeature) return;

        const newFeature: DrawnFeature = {
          ...pendingFeature,
          label: label || pendingFeature.label,
          attributes,
          synced: false,
          id: `feat-${crypto.randomUUID()}`,
          createdAt: Date.now(),
        };

        set({ 
          features: [...features, newFeature], 
          unsavedCount: unsavedCount + 1,
          pendingFeature: null,
          drawMode: "SELECT"
        });
      },

      unsavedCount: 0,
      incrementUnsaved: () => set((s) => ({ unsavedCount: s.unsavedCount + 1 })),
      resetUnsaved: () => set({ unsavedCount: 0 }),

      features: [],

      updateFeature: (id, data) =>
        set((s) => ({
          features: s.features.map((f) => (f.id === id ? { ...f, ...data } : f)),
          unsavedCount: s.unsavedCount + 1
        })),

      removeFeature: (id) =>
        set((s) => ({
          features: s.features.filter((f) => f.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
          unsavedCount: s.unsavedCount + 1
        })),

      clearFeatures: () => set({ features: [], selectedId: null, draftPoints: [], pendingFeature: null }),
      
      syncAll: () => set((s) => ({
        features: s.features.map(f => ({ ...f, synced: true })),
        unsavedCount: 0
      })),

      // 🚀 OBRIGATÓRIO: Funções do Shapefile
      baseLayersData: [],
      setBaseLayersData: (layers) => set({ baseLayersData: layers }),

      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),

      draftPoints: [],

      addDraftPoint: (point) => {
        const { drawMode, draftPoints } = get();
        if (drawMode !== "SELECT" && drawMode !== "line" && drawMode !== "polygon") {
          set({ pendingFeature: { type: drawMode, coords: [point] } });
          return;
        }
        set({ draftPoints: [...draftPoints, point] });
      },

      finishDraft: () => {
        const { drawMode, draftPoints } = get();
        if (draftPoints.length > 1 && (drawMode === "line" || drawMode === "polygon")) {
          set({ 
            pendingFeature: { type: drawMode, coords: draftPoints, color: "#3b82f6" },
            draftPoints: [] 
          });
        } else {
          set({ draftPoints: [], drawMode: "SELECT" });
        }
      },

      clearDraftPoints: () => set({ draftPoints: [] }),

      viewState: {
        longitude: -38.5267,
        latitude:  -3.7319,
        zoom:      12,
        bearing:   0,
        pitch:     0,
      },
      setViewState: (vs) => set({ viewState: vs }),
      flyToCity: (lng, lat, zoom = 14) => set((s) => ({
        viewState: { ...s.viewState, longitude: lng, latitude: lat, zoom, transitionDuration: 2000 }
      })),

      // 🚀 INICIA A BASE GIS LIGADA POR PADRÃO
      layers: {
        basegis: true, ativos: true, obras: true, alertas: true, viario: true, topografia: false,
      },
      toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
      setLayerAll: (visible) => set((s) => ({
        layers: Object.fromEntries(Object.keys(s.layers).map((k) => [k, visible])) as LayerVisibility,
      })),

      // 🚀 MAPA INICIA NO MODO GIS (Fundo Branco)
      mapStyle: "gis",
      setMapStyle: (style) => set({ mapStyle: style }),

      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    { name: "UrbanDesk · MapStore" }
  )
);

export const selectDrawMode   = (s: MapStore) => s.drawMode;
export const selectFeatures   = (s: MapStore) => s.features;
export const selectLayers     = (s: MapStore) => s.layers;
export const selectViewState  = (s: MapStore) => s.viewState;
export const selectDraftPoints= (s: MapStore) => s.draftPoints;
export const selectUnsavedCount = (s: MapStore) => s.unsavedCount;
export const selectPendingFeature = (s: MapStore) => s.pendingFeature;