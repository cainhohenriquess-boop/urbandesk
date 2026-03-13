import { formatBRLCompact, formatNumber } from "@/lib/utils";
import type { ProjectPortfolioSummary } from "@/components/projetos/project-portfolio-model";

type ProjectPortfolioMetricsProps = {
  summary: ProjectPortfolioSummary;
  loading: boolean;
};

const METRIC_ITEMS = [
  {
    key: "totalProjects",
    label: "Projetos na carteira",
    tone: "text-foreground",
  },
  {
    key: "delayedProjects",
    label: "Atrasados",
    tone: "text-danger-700",
  },
  {
    key: "inExecutionProjects",
    label: "Em execução",
    tone: "text-brand-700",
  },
  {
    key: "completedProjects",
    label: "Concluídos",
    tone: "text-accent-700",
  },
] as const;

export function ProjectPortfolioMetrics({
  summary,
  loading,
}: ProjectPortfolioMetricsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {METRIC_ITEMS.map((item) => (
        <article
          key={item.key}
          className="rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {item.label}
          </p>
          {loading ? (
            <div className="mt-4 h-8 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <p className={`mt-3 font-display text-3xl font-800 ${item.tone}`}>
              {formatNumber(summary[item.key])}
            </p>
          )}
        </article>
      ))}

      <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Orçamento consolidado
        </p>
        {loading ? (
          <div className="mt-4 h-8 w-28 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-3 font-display text-3xl font-800 text-foreground">
            {formatBRLCompact(summary.consolidatedBudget)}
          </p>
        )}
      </article>
    </section>
  );
}
