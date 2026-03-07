// src/store/useMapStore.ts
import { create } from 'zustand';

type DrawMode = 'point' | 'line' | 'polygon' | null;

interface Feature {
  id: string;
  type: string;
  coordinates: number[] | number[][];
}

interface MapState {
  drawMode: DrawMode;
  features: Feature[];
  layers: any[];
  selectedFeature: Feature | null;
  unsavedCount: number;
  
  setDrawMode: (mode: DrawMode) => void;
  addFeature: (feature: Feature) => void;
  removeFeature: (id: string) => void;
}

export const useMapStore = create<MapState>((set) => ({
  drawMode: null,
  features: [],
  layers: [],
  selectedFeature: null,
  unsavedCount: 0,
  
  setDrawMode: (mode) => set({ drawMode: mode }),
  addFeature: (feature) => set((state) => ({ 
    features: [...state.features, feature],
    unsavedCount: state.unsavedCount + 1 
  })),
  removeFeature: (id) => set((state) => ({ 
    features: state.features.filter((f) => f.id !== id) 
  })),
}));

// Exportando os "Selectors" que as suas telas estão pedindo
export const selectDrawMode = (state: MapState) => state.drawMode;
export const selectFeatures = (state: MapState) => state.features;
export const selectLayers = (state: MapState) => state.layers;
export const selectSelectedFeature = (state: MapState) => state.selectedFeature;
export const selectUnsavedCount = (state: MapState) => state.unsavedCount;