// ─────────────────────────────────────────────
// UrbanDesk — Tipagens Globais TypeScript
// ─────────────────────────────────────────────

// ── Roles & Auth ─────────────────────────────
export type UserRole =
  | "SUPERADMIN"
  | "SECRETARIO"
  | "ENGENHEIRO"
  | "CAMPO";

export interface AuthUser {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  tenantId?:   string;
  tenantName?: string;
  trialEndsAt?: string;
  avatarUrl?:  string;
}

// ── Tenant (Prefeitura) ───────────────────────
export type TenantStatus = "TRIAL" | "ATIVO" | "INADIMPLENTE" | "CANCELADO";
export type TenantPlan   = "STARTER" | "PRO" | "ENTERPRISE";

export interface Tenant {
  id:          string;
  name:        string;
  slug:        string;
  cnpj:        string;
  state:       string;
  plan:        TenantPlan;
  status:      TenantStatus;
  mrr:         number;
  trialEndsAt?: string;
  logoUrl?:    string;
  createdAt:   string;
  updatedAt:   string;
  // Agregados opcionais
  _count?: {
    users:    number;
    projects: number;
    assets:   number;
  };
}

// ── Projeto ───────────────────────────────────
export type ProjectStatus =
  | "PLANEJADO"
  | "EM_ANDAMENTO"
  | "PARALISADO"
  | "CONCLUIDO"
  | "CANCELADO";

export interface Project {
  id:            string;
  name:          string;
  description?:  string;
  status:        ProjectStatus;
  budget?:       number;
  startDate?:    string;
  endDate?:      string;
  completionPct: number;
  tenantId:      string;
  createdAt:     string;
  updatedAt:     string;
  // Agregados opcionais
  _count?: { assets: number };
}

// ── Ativo GIS ─────────────────────────────────
export type AssetType = "PONTO" | "TRECHO" | "AREA";

export interface GeoCoords {
  lat:       number;
  lng:       number;
  accuracy?: number;
}

export interface Asset {
  id:          string;
  name:        string;
  type:        AssetType;
  description?: string;
  photos:      string[];
  attributes:  Record<string, string | number | boolean>;
  geomWkt?:    string;
  lat?:        number;
  lng?:        number;
  srid:        number;
  tenantId:    string;
  projectId?:  string;
  createdAt:   string;
  updatedAt:   string;
}

export interface AssetLog {
  id:        string;
  note:      string;
  photos:    string[];
  lat?:      number;
  lng?:      number;
  assetId:   string;
  userId:    string;
  createdAt: string;
}

// ── GIS / Mapa ────────────────────────────────
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

export interface LayerVisibility {
  ativos:     boolean;
  obras:      boolean;
  alertas:    boolean;
  viario:     boolean;
  topografia: boolean;
}

// ── GeoJSON helpers ───────────────────────────
export interface GeoJSONPoint {
  type:        "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoJSONLineString {
  type:        "LineString";
  coordinates: [number, number][];
}

export interface GeoJSONPolygon {
  type:        "Polygon";
  coordinates: [number, number][][];
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONPolygon;

export interface GeoJSONFeature<G = GeoJSONGeometry, P = Record<string, unknown>> {
  type:       "Feature";
  geometry:   G;
  properties: P;
}

export interface GeoJSONFeatureCollection<G = GeoJSONGeometry, P = Record<string, unknown>> {
  type:     "FeatureCollection";
  features: GeoJSONFeature<G, P>[];
}

// ── API responses ─────────────────────────────
export interface ApiResponse<T = unknown> {
  data?:    T;
  error?:   string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data:    T[];
  total:   number;
  page:    number;
  perPage: number;
  pages:   number;
}

// ── KPI / Dashboard ───────────────────────────
export interface KpiData {
  label:    string;
  value:    string | number;
  change?:  string;
  up?:      boolean;
  unit?:    string;
}

export interface ChartDataPoint {
  label:  string;
  value:  number;
  color?: string;
}

// ── Financeiro SaaS ───────────────────────────
export type InvoiceStatus = "PENDENTE" | "PAGO" | "VENCIDO";

export interface Invoice {
  id:        string;
  amount:    number;
  status:    InvoiceStatus;
  dueDate:   string;
  paidAt?:   string;
  tenantId:  string;
  createdAt: string;
}

// ── PWA / Offline ─────────────────────────────
export interface OfflineAssetDraft {
  localId:   string;
  asset:     Omit<Asset, "id" | "createdAt" | "updatedAt">;
  photos:    string[]; // base64
  synced:    boolean;
  createdAt: number;
}
