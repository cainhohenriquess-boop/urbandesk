import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─────────────────────────────────────────────
// Tipos de Ativos B2G
// ─────────────────────────────────────────────
export type AssetCategory = 
  | "BOCA_LOBO" | "POCO_VISITA" | "HIDRANTE" 
  | "SEMAFORO" | "PLACA_TRANSITO" | "LOMBADA" | "PONTO_ONIBUS" | "RADAR"
  | "POSTE_LUZ" | "ARVORE" | "LIXEIRA" | "BURACO";

// DrawMode agora une suas geometrias básicas + os ativos técnicos
export type DrawMode = "SELECT" | "line" | "polygon" | AssetCategory;
export type MapStyle = "streets" | "satellite" | "topography" | "dark";

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
  synced:     boolean; // Adicionado para animação de envio
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
  drawMode:    DrawMode;
  setDrawMode: (mode: DrawMode) => void;

  unsavedCount: number;
  incrementUnsaved: () => void;
  resetUnsaved: () => void;

  features:      DrawnFeature[];
  addFeature:    (feature: Omit<DrawnFeature, "id" | "createdAt" | "synced">) => void;
  updateFeature: (id: string, data: Partial<DrawnFeature>) => void;
  removeFeature: (id: string) => void;
  clearFeatures: () => void;
  syncAll:       () => void; // Dispara quando clica em Salvar

  selectedId:    string | null;
  setSelectedId: (id: string | null) => void;

  draftPoints:      GeoPoint[];
  addDraftPoint:    (point: GeoPoint) => void;
  clearDraftPoints: () => void;
  finishDraft:      () => void; // Finaliza polígonos/linhas

  viewState:    MapViewState;
  setViewState: (vs: MapViewState) => void;

  layers:      LayerVisibility;
  toggleLayer: (key: keyof LayerVisibility) => void;
  setLayerAll: (visible: boolean) => void;

  mapStyle:    MapStyle;
  setMapStyle: (style: MapStyle) => void;

  activeProjectId:    string | null;
  setActiveProjectId: (id: string | null) => void;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useMapStore = create<MapStore>()(
  devtools(
    (set, get) => ({
      drawMode: "SELECT",
      setDrawMode: (mode) => set({ drawMode: mode, draftPoints: [] }),

      unsavedCount: 0,
      incrementUnsaved: () => set((s) => ({ unsavedCount: s.unsavedCount + 1 })),
      resetUnsaved: () => set({ unsavedCount: 0 }),

      features: [
        // Mock inicial B2G para testes visuais
        { id: "m1", type: "BOCA_LOBO", coords: [{ lng: -38.5270, lat: -3.7319 }], synced: true, createdAt: Date.now() },
        { id: "m2", type: "SEMAFORO",  coords: [{ lng: -38.5285, lat: -3.7325 }], synced: true, createdAt: Date.now() },
      ],

      addFeature: (data) => {
        const feature: DrawnFeature = {
          ...data,
          synced: false,
          id: `feat-${crypto.randomUUID()}`, // Refatorado: Uso de UUID v4 nativo para prevenir colisões de estado
          createdAt: Date.now(),
        };
        set((s) => ({ features: [...s.features, feature], unsavedCount: s.unsavedCount + 1 }));
      },

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

      clearFeatures: () => set({ features: [], selectedId: null, draftPoints: [] }),
      
      syncAll: () => set((s) => ({
        features: s.features.map(f => ({ ...f, synced: true })),
        unsavedCount: 0
      })),

      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),

      draftPoints: [],

      addDraftPoint: (point) => {
        const { drawMode, draftPoints, addFeature } = get();

        // Se for um ATIVO (ponto único normatizado), salva na hora
        if (drawMode !== "SELECT" && drawMode !== "line" && drawMode !== "polygon") {
          addFeature({ type: drawMode, coords: [point] });
          return;
        }

        // Se for linha/polígono, guarda no rascunho
        set({ draftPoints: [...draftPoints, point] });
      },

      finishDraft: () => {
        const { drawMode, draftPoints, addFeature } = get();
        if (draftPoints.length > 1 && (drawMode === "line" || drawMode === "polygon")) {
          addFeature({ type: drawMode, coords: draftPoints, color: "#3468f6" });
        }
        set({ draftPoints: [], drawMode: "SELECT" });
      },

      clearDraftPoints: () => set({ draftPoints: [] }),

      viewState: {
        longitude: -38.5267,
        latitude:  -3.7319,
        zoom:      15,
        bearing:   -17,
        pitch:     45,
      },
      setViewState: (vs) => set({ viewState: vs }),

      layers: {
        ativos: true, obras: true, alertas: true, viario: false, topografia: false,
      },
      toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
      setLayerAll: (visible) => set((s) => ({
        layers: Object.fromEntries(Object.keys(s.layers).map((k) => [k, visible])) as LayerVisibility,
      })),

      mapStyle: "dark", // Estilo escuro combina melhor com a UI B2G
      setMapStyle: (style) => set({ mapStyle: style }),

      activeProjectId: null,
      setActiveProjectId: (id) => set({ activeProjectId: id }),
    }),
    { name: "UrbanDesk · MapStore" }
  )
);

// Seletores
export const selectDrawMode   = (s: MapStore) => s.drawMode;
export const selectFeatures   = (s: MapStore) => s.features;
export const selectLayers     = (s: MapStore) => s.layers;
export const selectViewState  = (s: MapStore) => s.viewState;
export const selectDraftPoints= (s: MapStore) => s.draftPoints;
export const selectUnsavedCount = (s: MapStore) => s.unsavedCount;