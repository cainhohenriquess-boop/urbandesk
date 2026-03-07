import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Sparkline SVG mínimo (sem dependência externa)
// ─────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const max  = Math.max(...data);
  const min  = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const area = `${pts[0].split(",")[0]},${h} ${polyline} ${pts[pts.length - 1].split(",")[0]},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-70">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color})`} />
      <polyline points={polyline} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Ícone de trend
// ─────────────────────────────────────────────
function TrendIcon({ up }: { up: boolean }) {
  return (
    <svg className={cn("h-3 w-3", up ? "text-accent-500" : "text-danger-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      {up
        ? <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      }
    </svg>
  );
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
export interface KpiCardProps {
  label:       string;
  value:       string | number;
  sub?:        string;
  change?:     string;
  up?:         boolean;
  sparkline?:  number[];
  sparkColor?: string;
  icon?:       React.ReactNode;
  accentColor?: string; // classe Tailwind ex: "text-brand-600"
  loading?:    boolean;
  onClick?:    () => void;
  className?:  string;
}

// ─────────────────────────────────────────────
// KpiCard
// ─────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  sub,
  change,
  up,
  sparkline,
  sparkColor = "#3468f6",
  icon,
  accentColor,
  loading = false,
  onClick,
  className,
}: KpiCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "kpi-card group relative",
        onClick && "cursor-pointer hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 rounded-xl bg-muted/40 animate-pulse" />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p className={cn(
            "font-display text-2xl font-800 text-foreground tabular-num leading-tight",
            loading && "opacity-0"
          )}>
            {value}
          </p>
          {sub && (
            <p className="text-xs text-muted-foreground truncate">{sub}</p>
          )}
        </div>

        {/* Ícone ou Sparkline */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {icon && (
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-muted", accentColor)}>
              {icon}
            </div>
          )}
          {sparkline && (
            <Sparkline data={sparkline} color={sparkColor} />
          )}
        </div>
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className={cn(
          "mt-3 flex items-center gap-1 text-xs font-medium",
          up === true  && "text-accent-600",
          up === false && "text-danger-500",
          up === undefined && "text-muted-foreground"
        )}>
          {up !== undefined && <TrendIcon up={up} />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KpiCardSkeleton — placeholder de carregamento
// ─────────────────────────────────────────────
export function KpiCardSkeleton() {
  return (
    <div className="kpi-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="h-3 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}
