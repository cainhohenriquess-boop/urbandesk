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
  setDrawMode: (mode: DrawMode) => void;
  addFeature: (feature: Feature) => void;
  removeFeature: (id: string) => void;
}

export const useMapStore = create<MapState>((set) => ({
  drawMode: null,
  features: [],
  setDrawMode: (mode) => set({ drawMode: mode }),
  addFeature: (feature) => set((state) => ({ features: [...state.features, feature] })),
  removeFeature: (id) => set((state) => ({ features: state.features.filter((f) => f.id !== id) })),
}));