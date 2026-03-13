import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-accent-50 text-accent-700 ring-accent-200",
  warning: "bg-warning-50 text-warning-700 ring-warning-200",
  danger: "bg-danger-50 text-danger-700 ring-danger-200",
};

const progressToneClasses: Record<Tone, string> = {
  neutral: "bg-slate-500",
  brand: "bg-brand-500",
  success: "bg-accent-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

type ProjectBadgeProps = {
  label: string;
  tone?: Tone;
};

export function ProjectBadge({ label, tone = "neutral" }: ProjectBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}

type ProjectSectionCardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function ProjectSectionCard({
  title,
  eyebrow,
  description,
  action,
  className,
  children,
}: ProjectSectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-card",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-2 font-display text-xl font-700 text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

type ProjectMetricCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function ProjectMetricCard({
  label,
  value,
  helper,
}: ProjectMetricCardProps) {
  return (
    <article className="rounded-xl border border-border bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-700 text-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
      ) : null}
    </article>
  );
}

type ProjectProgressCardProps = {
  label: string;
  value: number;
  helper?: string;
  tone?: Tone;
};

export function ProjectProgressCard({
  label,
  value,
  helper,
  tone = "brand",
}: ProjectProgressCardProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <article className="rounded-xl border border-border bg-background px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <span className="text-sm font-semibold text-foreground">{safeValue}%</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", progressToneClasses[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {helper ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
      ) : null}
    </article>
  );
}

type ProjectEmptyBlockProps = {
  title: string;
  description: string;
};

export function ProjectEmptyBlock({
  title,
  description,
}: ProjectEmptyBlockProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-8 text-center">
      <h4 className="font-display text-lg font-700 text-foreground">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
