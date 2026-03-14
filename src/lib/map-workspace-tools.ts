import { distanciaKm, areaPoligonoM2, comprimentoTrechoM } from "@/lib/turf";
import type { DrawnFeature, GeoPoint } from "@/store/useMapStore";

const SNAP_THRESHOLD_METERS = 8;
const JOIN_THRESHOLD_METERS = 12;

type PointLike = { lat: number; lng: number };

function distanceMeters(a: PointLike, b: PointLike) {
  return distanciaKm([a.lat, a.lng], [b.lat, b.lng]) * 1000;
}

function projectPointOnSegment(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const ax = start.lng;
  const ay = start.lat;
  const bx = end.lng;
  const by = end.lat;
  const px = point.lng;
  const py = point.lat;
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;

  if (ab2 === 0) {
    return { point: start, t: 0, distanceMeters: distanceMeters(point, start) };
  }

  const apx = px - ax;
  const apy = py - ay;
  const rawT = (apx * abx + apy * aby) / ab2;
  const t = Math.max(0, Math.min(1, rawT));
  const projected = {
    lng: ax + abx * t,
    lat: ay + aby * t,
  };

  return {
    point: projected,
    t,
    distanceMeters: distanceMeters(point, projected),
  };
}

export function snapToNearestVertex(point: GeoPoint, features: DrawnFeature[], enabled: boolean) {
  if (!enabled) return point;

  let best: GeoPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const feature of features) {
    for (const coord of feature.coords) {
      const distance = distanceMeters(point, coord);
      if (distance < SNAP_THRESHOLD_METERS && distance < bestDistance) {
        best = coord;
        bestDistance = distance;
      }
    }
  }

  return best ?? point;
}

export function translateFeature(feature: DrawnFeature, deltaLat: number, deltaLng: number): GeoPoint[] {
  return feature.coords.map((coord) => ({
    lat: coord.lat + deltaLat,
    lng: coord.lng + deltaLng,
  }));
}

export function getFeatureMetric(feature: DrawnFeature) {
  if (feature.type === "line") {
    return {
      kind: "distance" as const,
      value: comprimentoTrechoM(feature.coords.map((coord) => [coord.lat, coord.lng] as [number, number])),
    };
  }

  if (feature.type === "polygon") {
    return {
      kind: "area" as const,
      value: areaPoligonoM2(feature.coords.map((coord) => [coord.lat, coord.lng] as [number, number])),
    };
  }

  return {
    kind: "point" as const,
    value: 0,
  };
}

export function measureDistance(points: GeoPoint[]) {
  if (points.length < 2) return 0;
  return comprimentoTrechoM(points.map((coord) => [coord.lat, coord.lng] as [number, number]));
}

export function measureArea(points: GeoPoint[]) {
  if (points.length < 3) return 0;
  return areaPoligonoM2(points.map((coord) => [coord.lat, coord.lng] as [number, number]));
}

export function splitLineFeature(feature: DrawnFeature, clickPoint: GeoPoint) {
  if (feature.type !== "line" || feature.coords.length < 2) return null;

  let bestSegmentIndex = -1;
  let bestProjection: GeoPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < feature.coords.length - 1; index += 1) {
    const projection = projectPointOnSegment(clickPoint, feature.coords[index], feature.coords[index + 1]);
    if (projection.distanceMeters < bestDistance) {
      bestDistance = projection.distanceMeters;
      bestSegmentIndex = index;
      bestProjection = projection.point;
    }
  }

  if (!bestProjection || bestSegmentIndex < 0 || bestDistance > JOIN_THRESHOLD_METERS) {
    return null;
  }

  const first = [
    ...feature.coords.slice(0, bestSegmentIndex + 1),
    bestProjection,
  ];
  const second = [
    bestProjection,
    ...feature.coords.slice(bestSegmentIndex + 1),
  ];

  if (first.length < 2 || second.length < 2) return null;

  return { first, second, splitPoint: bestProjection };
}

function cloneCoords(coords: GeoPoint[]) {
  return coords.map((coord) => ({ ...coord }));
}

function endpointsMatch(a: GeoPoint, b: GeoPoint) {
  return distanceMeters(a, b) <= JOIN_THRESHOLD_METERS;
}

export function joinLineFeatures(first: DrawnFeature, second: DrawnFeature) {
  if (first.type !== "line" || second.type !== "line") return null;
  if (first.coords.length < 2 || second.coords.length < 2) return null;

  const firstStart = first.coords[0];
  const firstEnd = first.coords[first.coords.length - 1];
  const secondStart = second.coords[0];
  const secondEnd = second.coords[second.coords.length - 1];

  if (endpointsMatch(firstEnd, secondStart)) {
    return [...cloneCoords(first.coords), ...cloneCoords(second.coords).slice(1)];
  }

  if (endpointsMatch(firstEnd, secondEnd)) {
    return [...cloneCoords(first.coords), ...cloneCoords(second.coords).reverse().slice(1)];
  }

  if (endpointsMatch(firstStart, secondEnd)) {
    return [...cloneCoords(second.coords), ...cloneCoords(first.coords).slice(1)];
  }

  if (endpointsMatch(firstStart, secondStart)) {
    return [...cloneCoords(second.coords).reverse(), ...cloneCoords(first.coords).slice(1)];
  }

  return null;
}

export function findSpatialMatches(features: DrawnFeature[], center: GeoPoint, radiusMeters: number) {
  return features
    .filter((feature) =>
      feature.coords.some((coord) => distanceMeters(coord, center) <= radiusMeters)
    )
    .map((feature) => feature.id);
}

export function featureAnchor(feature: DrawnFeature): GeoPoint | null {
  if (feature.coords.length === 0) return null;
  if (feature.type !== "line" && feature.type !== "polygon") return feature.coords[0] ?? null;

  const total = feature.coords.reduce(
    (acc, coord) => ({ lat: acc.lat + coord.lat, lng: acc.lng + coord.lng }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / feature.coords.length,
    lng: total.lng / feature.coords.length,
  };
}

export function importGeoJsonFeatures(raw: string, projectId: string): DrawnFeature[] {
  const parsed = JSON.parse(raw) as {
    type?: string;
    features?: Array<{
      geometry?: { type?: string; coordinates?: any };
      properties?: Record<string, any>;
    }>;
  };

  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("GeoJSON inválido. Use um FeatureCollection.");
  }

  return parsed.features.reduce<DrawnFeature[]>((acc, feature, index) => {
      const geometry = feature.geometry;
      const properties = feature.properties ?? {};
      if (!geometry?.type || !geometry.coordinates) return acc;

      if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
        const [lng, lat] = geometry.coordinates;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return acc;
        acc.push({
          id: `import-${crypto.randomUUID()}`,
          type:
            typeof properties.subType === "string"
              ? (properties.subType as DrawnFeature["type"])
              : "BOCA_LOBO",
          coords: [{ lat: Number(lat), lng: Number(lng) }],
          label: properties.name || properties.label || `Ponto importado ${index + 1}`,
          description: properties.description || null,
          projectId,
          photos: Array.isArray(properties.photos) ? properties.photos : [],
          synced: false,
          createdAt: Date.now(),
          attributes: properties,
        } satisfies DrawnFeature);
        return acc;
      }

      if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
        const coords = geometry.coordinates
          .filter((pair: any) => Array.isArray(pair) && pair.length >= 2)
          .map((pair: any) => ({ lat: Number(pair[1]), lng: Number(pair[0]) }))
          .filter((coord: GeoPoint) => Number.isFinite(coord.lat) && Number.isFinite(coord.lng));
        if (coords.length < 2) return acc;
        acc.push({
          id: `import-${crypto.randomUUID()}`,
          type: "line",
          coords,
          label: properties.name || properties.label || `Trecho importado ${index + 1}`,
          description: properties.description || null,
          projectId,
          photos: Array.isArray(properties.photos) ? properties.photos : [],
          synced: false,
          createdAt: Date.now(),
          color: "#3b82f6",
          attributes: properties,
        } satisfies DrawnFeature);
        return acc;
      }

      if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates?.[0])) {
        const coords = geometry.coordinates[0]
          .filter((pair: any) => Array.isArray(pair) && pair.length >= 2)
          .map((pair: any) => ({ lat: Number(pair[1]), lng: Number(pair[0]) }))
          .filter((coord: GeoPoint) => Number.isFinite(coord.lat) && Number.isFinite(coord.lng));
        if (coords.length < 3) return acc;
        acc.push({
          id: `import-${crypto.randomUUID()}`,
          type: "polygon",
          coords,
          label: properties.name || properties.label || `Área importada ${index + 1}`,
          description: properties.description || null,
          projectId,
          photos: Array.isArray(properties.photos) ? properties.photos : [],
          synced: false,
          createdAt: Date.now(),
          color: "#3b82f6",
          attributes: properties,
        } satisfies DrawnFeature);
        return acc;
      }

      return acc;
    }, []);
}
