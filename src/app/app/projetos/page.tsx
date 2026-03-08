"use client";

import { useEffect, useState } from "react";
import { useMapStore, DrawnFeature, BaseLayerData } from "@/store/useMapStore";
import { MapCanvas } from "@/components/map/map-canvas";
import { DrawingToolbar } from "@/components/map/drawing-toolbar";
import { LayerPanel } from "@/components/map/layer-panel";

// ─────────────────────────────────────────────
// Conversores WKT <-> JSON
// ─────────────────────────────────────────────
function coordsToWkt(feature: DrawnFeature): string {
  if (feature.type === "line") {
    const pts = feature.coords.map((c) => `${c.lng} ${c.lat}`).join(", ");
    return `LINESTRING(${pts})`;
  }
  if (feature.type === "polygon") {
    const pts = feature.coords.map((c) => `${c.lng} ${c.lat}`);
    if (pts[0] !== pts[pts.length - 1]) pts.push(pts[0]);
    return `POLYGON((-(${pts.join(", ")}))`; 
  }
  return `POINT(${feature.coords[0].lng} ${feature.coords[0].lat})`;
}

function wktToCoords(wkt: string | null) {
  if (!wkt) return [];
  const content = wkt.match(/\((.*)\)/)?.[1];
  if (!content) return [];
  const cleanContent = content.replace(/\(/g, "").replace(/\)/g, "");
  const points = cleanContent.split(",").map((p) => p.trim().split(" "));
  return points.map((p) => ({ lng: parseFloat(p[0]), lat: parseFloat(p[1]) }));
}

// ─────────────────────────────────────────────
// Motor de Bounding Box (Acha o centro de qualquer Shapefile)
// ─────────────────────────────────────────────
function getGeoJsonCenter(geojson: any) {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  let found = false;

  function extract(coords: any[]) {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0]); maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]); maxLat = Math.max(maxLat, coords[1]);
      found = true;
    } else if (Array.isArray(coords)) {
      coords.forEach(extract);
    }
  }

  if (geojson.features) {
    geojson.features.forEach((f: any) => { if (f.geometry) extract(f.geometry.coordinates); });
  } else if (geojson.geometry) {
    extract(geojson.geometry.coordinates);
  }

  if (found) return { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
  return null;
}

// ─────────────────────────────────────────────
// Workspace Principal
// ─────────────────────────────────────────────
export default function ProjetosPage() {
  const { features, unsavedCount, syncAll, setBaseLayersData, flyToCity } = useMapStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const resGis = await fetch("/api/gis");
        const jsonGis = await resGis.json();

        if (jsonGis.data && jsonGis.data.features) {
          const parsedFeatures: DrawnFeature[] = jsonGis.data.features.map((f: any) => {
            const props = f.properties;
            const coords = wktToCoords(props.geomWkt);
            return {
              id: props.id, type: props.subType || "BOCA_LOBO", coords: coords,
              synced: true, attributes: props, label: props.name, createdAt: Date.now(),
            };
          });
          useMapStore.setState({ features: parsedFeatures, unsavedCount: 0 });
        }

        const resBase = await fetch("/api/baselayers");
        const jsonBase = await resBase.json();
        
        if (jsonBase.data && jsonBase.data.length > 0) {
          setBaseLayersData(jsonBase.data);
          
          // Busca o limite da cidade (BOUNDARY) ou as ruas para centralizar o mapa
          const targetLayer = jsonBase.data.find((l: BaseLayerData) => l.type === "BOUNDARY") 
                           || jsonBase.data.find((l: BaseLayerData) => l.type === "STREETS");
                           
          if (targetLayer && targetLayer.geoJsonData) {
            const center = getGeoJsonCenter(targetLayer.geoJsonData);
            if (center) {
              // Voa exatamente para o centro calculado com Zoom 13
              flyToCity(center.lng, center.lat, 13);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar mapa:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setBaseLayersData, flyToCity]);

  const handleSync = async () => {
    const unsaved = features.filter((f) => !f.synced);
    if (unsaved.length === 0) return;
    setIsSyncing(true);

    try {
      const promises = unsaved.map((f) => {
        const dbType = f.type === "line" ? "TRECHO" : f.type === "polygon" ? "AREA" : "PONTO";
        const wkt = coordsToWkt(f);

        return fetch("/api/gis", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.label || "Ativo Sem Nome", type: dbType, geomWkt: wkt,
            attributes: { ...f.attributes, subType: f.type },
          }),
        });
      });

      await Promise.all(promises);
      syncAll();
      alert("Projetos salvos com sucesso na base GIS!");
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao sincronizar com a base cartográfica.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background relative overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-lg font-bold text-foreground">Gestão de Projetos GIS</h1>
          {isLoading && (
            <span className="flex items-center gap-2 text-xs text-brand-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" /> Processando cartografia...
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {unsavedCount > 0 && <span className="text-xs font-bold text-warning-500 bg-warning-500/10 px-3 py-1.5 rounded-full animate-pulse">{unsavedCount} ativo(s) pendente(s)</span>}
          <button onClick={handleSync} disabled={unsavedCount === 0 || isSyncing} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white transition-all rounded-lg shadow-sm ${unsavedCount > 0 ? "bg-brand-600 hover:bg-brand-500 hover:shadow-brand-500/20" : "bg-slate-700 opacity-50 cursor-not-allowed"}`}>
            {isSyncing ? <> <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Sincronizando... </> : <> <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Salvar na Base </>}
          </button>
        </div>
      </header>

      <div className="flex-1 relative w-full h-full">
        <div className="absolute inset-0"><MapCanvas /></div>
        <DrawingToolbar />
        <LayerPanel className="absolute right-4 top-4 w-64 shadow-2xl" />
      </div>
    </div>
  );
}