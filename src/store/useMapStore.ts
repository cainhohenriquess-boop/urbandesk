import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────
export type DrawMode = "none" | "point" | "line" | "polygon";
export type MapStyle = "streets" | "satellite" | "topography";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DrawnFeature {
  id:         string;
  type:       "point" | "line" | "polygon";
  coords:     GeoPoint[];
  label?:     string;
  projectId?: string;
  color?:     string;
  createdAt:  number;
}

export interface MapViewState {
  longitude: number;
  latitude:  number;
  zoom:      number;
  bearing?:  number;
  pitch?:    number;
}

export interface LayerVisibility {
  ativos:     boolean;
  obras:      boolean;
  alertas:    boolean;
  viario:     boolean;
  topografia: boolean;
}

// ─────────────────────────────────────────────
// Interface do store
// ─────────────────────────────────────────────
interface MapStore {
  // Modo de desenho ativo
  drawMode:    DrawMode;
  setDrawMode: (mode: DrawMode) => void;

  // Contador de alterações não salvas
  unsavedCount: number;
  incrementUnsaved: () => void;
  resetUnsaved: () => void;

  // Features salvas no mapa
  features:      DrawnFeature[];
  addFeature:    (feature: Omit<DrawnFeature, "id" | "createdAt">) => void;
  updateFeature: (id: string, data: Partial<DrawnFeature>) => void;
  removeFeature: (id: string) => void;
  clearFeatures: () => void;

  // Feature selecionada
  selectedId:    string | null;
  setSelectedId: (id: string | null) => void;

  // Pontos em construção (linha/polígono em progresso)
  draftPoints:      GeoPoint[];
  addDraftPoint:    (point: GeoPoint) => void;
  clearDraftPoints: () => void;

  // Viewport do mapa
  viewState:    MapViewState;
  setViewState: (vs: MapViewState) => void;

  // Visibilidade das camadas
  layers:      LayerVisibility;
  toggleLayer: (key: keyof LayerVisibility) => void;
  setLayerAll: (visible: boolean) => void;

  // Estilo base do mapa
  mapStyle:    MapStyle;
  setMapStyle: (style: MapStyle) => void;

  // Projeto ativo para filtro
  activeProjectId:    string | null;
  setActiveProjectId: (id: string | null) => void;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useMapStore = create<MapStore>()(
  devtools(
    (set, get) => ({
      // ── Modo de desenho ──
      drawMode: "none",
      setDrawMode: (mode) => set({ drawMode: mode, draftPoints: [] }),

      // ── Unsaved Count ──
      unsavedCount: 0,
      incrementUnsaved: () => set((s) => ({ unsavedCount: s.unsavedCount + 1 })),
      resetUnsaved: () => set({ unsavedCount: 0 }),

      // ── Features ──
      features: [],

      addFeature: (data) => {
        const feature: DrawnFeature = {
          ...data,
          id:        `feat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: Date.now(),
        };
        set((s) => ({ features: [...s.features, feature] }));
      },

      updateFeature: (id, data) =>
        set((s) => ({
          features: s.features.map((f) => (f.id === id ? { ...f, ...data } : f)),
        })),

      removeFeature: (id) =>
        set((s) => ({
          features:   s.features.filter((f) => f.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      clearFeatures: () => set({ features: [], selectedId: null, draftPoints: [] }),

      // ── Seleção ──
      selectedId:    null,
      setSelectedId: (id) => set({ selectedId: id }),

      // ── Draft ──
      draftPoints: [],

      addDraftPoint: (point) => {
        const { drawMode, draftPoints } = get();

        // Ponto único: salva direto e volta ao modo none
        if (drawMode === "point") {
          get().addFeature({ type: "point", coords: [point] });
          set({ draftPoints: [], drawMode: "none" });
          return;
        }

        set({ draftPoints: [...draftPoints, point] });
      },

      clearDraftPoints: () => set({ draftPoints: [] }),

      // ── Viewport ──
      viewState: {
        longitude: -38.5267,
        latitude:  -3.7319,
        zoom:       13,
        bearing:    0,
        pitch:      0,
      },
      setViewState: (vs) => set({ viewState: vs }),

      // ── Camadas ──
      layers: {
        ativos:     true,
        obras:      true,
        alertas:    true,
        viario:     false,
        topografia: false,
      },

      toggleLayer: (key) =>
        set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),

      setLayerAll: (visible) =>
        set((s) => ({
          layers: Object.fromEntries(
            Object.keys(s.layers).map((k) => [k, visible])
          ) as LayerVisibility,
        })),

      // ── Estilo de mapa ──
      mapStyle:    "streets",
      setMapStyle: (style) => set({ mapStyle: style }),

      // ── Projeto ativo ──
      activeProjectId:    null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    { name: "UrbanDesk · MapStore" }
  )
);

// ─────────────────────────────────────────────
// Seletores (evitam re-renders desnecessários)
// ─────────────────────────────────────────────
export const selectDrawMode  = (s: MapStore) => s.drawMode;
export const selectFeatures  = (s: MapStore) => s.features;
export const selectLayers    = (s: MapStore) => s.layers;
export const selectViewState = (s: MapStore) => s.viewState;

export const selectSelectedFeature = (s: MapStore) =>
  s.features.find((f) => f.id === s.selectedId) ?? null;

export const selectDraftPoints = (s: MapStore) => s.draftPoints;

export const selectFeatureCount = (s: MapStore) => s.features.length;

export const selectIsDrawing = (s: MapStore) => s.drawMode !== "none";

export const selectUnsavedCount = (s: MapStore) => s.unsavedCount;
