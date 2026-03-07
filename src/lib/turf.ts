// ─────────────────────────────────────────────
// UrbanDesk — Utilitários Geoespaciais (Turf.js)
// Todas as funções são puras e isoladas para
// facilitar tree-shaking e testes unitários.
// ─────────────────────────────────────────────
import * as turf from "@turf/turf";
import type { Feature, LineString, Polygon, Point, Position } from "geojson";

// ─────────────────────────────────────────────
// 1. Distância entre dois pontos (km)
// ─────────────────────────────────────────────
/**
 * Calcula a distância em km entre dois pontos GPS (Haversine).
 * Uso: distanciaKm([-3.71, -38.52], [-3.74, -38.53]) → 0.342
 */
export function distanciaKm(
  from: [lat: number, lng: number],
  to:   [lat: number, lng: number]
): number {
  const ptFrom = turf.point([from[1], from[0]]); // turf usa [lng, lat]
  const ptTo   = turf.point([to[1],   to[0]]);
  return turf.distance(ptFrom, ptTo, { units: "kilometers" });
}

// ─────────────────────────────────────────────
// 2. Comprimento de uma linha (metros)
// ─────────────────────────────────────────────
/**
 * Calcula o comprimento total de um trecho (polyline) em metros.
 * coords: array de [lat, lng]
 */
export function comprimentoTrechoM(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  const turfCoords: Position[] = coords.map(([lat, lng]) => [lng, lat]);
  const line = turf.lineString(turfCoords);
  return turf.length(line, { units: "meters" });
}

// ─────────────────────────────────────────────
// 3. Área de um polígono (m²)
// ─────────────────────────────────────────────
/**
 * Calcula a área de um polígono em m².
 * coords: anel externo de [lat, lng] (auto-fecha se necessário)
 */
export function areaPoligonoM2(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const turfCoords: Position[] = coords.map(([lat, lng]) => [lng, lat]);
  // Fecha o anel se necessário
  const ring = [...turfCoords];
  const first = ring[0], last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }
  const poly = turf.polygon([ring]);
  return turf.area(poly); // retorna m²
}

// ─────────────────────────────────────────────
// 4. Bounding Box de um conjunto de pontos
// ─────────────────────────────────────────────
/**
 * Retorna o bbox [minLng, minLat, maxLng, maxLat] de um conjunto de coords.
 */
export function bboxDeCoords(
  coords: [lat: number, lng: number][]
): [number, number, number, number] {
  const points = turf.featureCollection(
    coords.map(([lat, lng]) => turf.point([lng, lat]))
  );
  return turf.bbox(points) as [number, number, number, number];
}

// ─────────────────────────────────────────────
// 5. Ponto dentro de polígono
// ─────────────────────────────────────────────
/**
 * Verifica se um ponto está dentro de um polígono.
 * Util para validar se um ativo pertence a uma área de projeto.
 */
export function pontoNoPoli(
  ponto:    [lat: number, lng: number],
  poligono: [lat: number, lng: number][]
): boolean {
  if (poligono.length < 3) return false;
  const pt   = turf.point([ponto[1], ponto[0]]);
  const ring: Position[] = poligono.map(([lat, lng]) => [lng, lat]);
  if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) {
    ring.push(ring[0]);
  }
  const poly = turf.polygon([ring]);
  return turf.booleanPointInPolygon(pt, poly);
}

// ─────────────────────────────────────────────
// 6. Buffer ao redor de um ponto (raio em metros)
// ─────────────────────────────────────────────
/**
 * Cria um buffer circular ao redor de um ponto.
 * Retorna as coordenadas do polígono resultante como [lat,lng][].
 */
export function bufferPontoM(
  centro:    [lat: number, lng: number],
  raioMetros: number
): [number, number][] {
  const pt  = turf.point([centro[1], centro[0]]);
  const buf = turf.buffer(pt, raioMetros / 1000, { units: "kilometers", steps: 32 });
  const coords = buf?.geometry?.coordinates[0] ?? [];
  return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
}

// ─────────────────────────────────────────────
// 7. Centróide de um polígono
// ─────────────────────────────────────────────
/**
 * Retorna o centróide [lat, lng] de um polígono.
 */
export function centroidePoligono(
  coords: [lat: number, lng: number][]
): [number, number] {
  const ring: Position[] = coords.map(([lat, lng]) => [lng, lat]);
  if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) {
    ring.push(ring[0]);
  }
  const poly = turf.polygon([ring]);
  const ctr  = turf.centroid(poly);
  const [lng, lat] = ctr.geometry.coordinates;
  return [lat, lng];
}

// ─────────────────────────────────────────────
// 8. Converter ativos para GeoJSON FeatureCollection
// ─────────────────────────────────────────────
interface AssetGeo {
  id:         string;
  name:       string;
  type:       string;
  lat?:       number | null;
  lng?:       number | null;
  projectId?: string | null;
  [key: string]: any;
}

/**
 * Converte um array de ativos do banco em GeoJSON FeatureCollection
 * pronto para uso com Mapbox GL Sources.
 */
export function assetsParaGeoJSON(assets: AssetGeo[]) {
  return turf.featureCollection(
    assets
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) =>
        turf.point([a.lng!, a.lat!], {
          id:        a.id,
          name:      a.name,
          type:      a.type,
          projectId: a.projectId ?? null,
        })
      )
  );
}

// ─────────────────────────────────────────────
// 9. Simplificar linha (reduz vértices para performance)
// ─────────────────────────────────────────────
/**
 * Simplifica uma polyline para reduzir o número de pontos.
 * tolerance: quanto maior, mais simplificado (padrão: 0.0001 ~11m)
 */
export function simplificarLinha(
  coords:    [lat: number, lng: number][],
  tolerance: number = 0.0001
): [number, number][] {
  const turfCoords: Position[] = coords.map(([lat, lng]) => [lng, lat]);
  const line       = turf.lineString(turfCoords);
  const simplified = turf.simplify(line, { tolerance, highQuality: false });
  return simplified.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
}
