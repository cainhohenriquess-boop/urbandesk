import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─────────────────────────────────────────────
// 1. cn — Merge de classes Tailwind + condicionais
// ─────────────────────────────────────────────
/**
 * Combina classes Tailwind de forma segura, resolvendo conflitos.
 * Uso: cn("px-4 py-2", isActive && "bg-brand-600", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// 2. Formatadores de moeda e números
// ─────────────────────────────────────────────

/**
 * Formata valor em Real Brasileiro (BRL).
 * Uso: formatBRL(1500000) → "R$ 1.500.000,00"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata valor compacto para KPI cards.
 * Uso: formatBRLCompact(1500000) → "R$ 1,5M"
 */
export function formatBRLCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formata número com separador de milhar BR.
 * Uso: formatNumber(12500) → "12.500"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/**
 * Formata porcentagem.
 * Uso: formatPercent(0.735) → "73,5%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ─────────────────────────────────────────────
// 3. Formatadores de data
// ─────────────────────────────────────────────

/**
 * Formata data no padrão brasileiro.
 * Uso: formatDate(new Date()) → "07/03/2025"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/**
 * Formata data e hora.
 * Uso: formatDateTime(new Date()) → "07/03/2025, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Retorna tempo relativo (ex: "há 3 horas").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (Math.abs(diffSecs) < 60)   return rtf.format(-diffSecs, "second");
  if (Math.abs(diffSecs) < 3600) return rtf.format(-Math.round(diffSecs / 60), "minute");
  if (Math.abs(diffSecs) < 86400) return rtf.format(-Math.round(diffSecs / 3600), "hour");
  return rtf.format(-Math.round(diffSecs / 86400), "day");
}

// ─────────────────────────────────────────────
// 4. Utilitários GIS / Geoespaciais
// ─────────────────────────────────────────────

/**
 * Formata coordenadas GPS para exibição.
 * Uso: formatCoords(-23.5505, -46.6333) → "-23.5505°, -46.6333°"
 */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
}

/**
 * Formata área em m² ou km² automaticamente.
 * Uso: formatArea(1_200_000) → "1,20 km²"
 */
export function formatArea(sqMeters: number): string {
  if (sqMeters >= 1_000_000) {
    return `${(sqMeters / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km²`;
  }
  return `${sqMeters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m²`;
}

/**
 * Formata distância em m ou km automaticamente.
 * Uso: formatDistance(1500) → "1,50 km"
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`;
  }
  return `${Math.round(meters).toLocaleString("pt-BR")} m`;
}

// ─────────────────────────────────────────────
// 5. Utilitários de status / Badge
// ─────────────────────────────────────────────

type ProjectStatus =
  | "PLANEJADO"
  | "EM_ANDAMENTO"
  | "PARALISADO"
  | "CONCLUIDO"
  | "CANCELADO";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  PLANEJADO:    { label: "Planejado",    color: "bg-slate-100 text-slate-700" },
  EM_ANDAMENTO: { label: "Em Andamento", color: "bg-brand-100 text-brand-700" },
  PARALISADO:   { label: "Paralisado",   color: "bg-warning-100 text-warning-700" },
  CONCLUIDO:    { label: "Concluído",    color: "bg-accent-100 text-accent-700" },
  CANCELADO:    { label: "Cancelado",    color: "bg-danger-100 text-danger-700" },
};

export function getStatusConfig(status: ProjectStatus) {
  return STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

// ─────────────────────────────────────────────
// 6. Utilitários gerais
// ─────────────────────────────────────────────

/**
 * Gera iniciais do nome para Avatar.
 * Uso: getInitials("João Silva") → "JS"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/**
 * Trunca texto com ellipsis.
 * Uso: truncate("texto muito longo", 10) → "texto mui…"
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

/**
 * Slug a partir de string (para URLs e IDs).
 * Uso: slugify("São Paulo") → "sao-paulo"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Delay assíncrono (útil para debounce em buscas GIS).
 * Uso: await sleep(300)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
