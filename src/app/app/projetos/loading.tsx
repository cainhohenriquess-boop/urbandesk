export default function ProjetosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="h-3 w-44 rounded bg-muted" />
          <div className="mt-4 h-8 w-96 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-4/5 rounded bg-muted" />
          <div className="mt-5 flex gap-3">
            <div className="h-10 w-48 rounded bg-muted" />
            <div className="h-10 w-40 rounded bg-muted" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="mt-4 h-4 w-full rounded bg-muted" />
          <div className="mt-3 h-4 w-5/6 rounded bg-muted" />
          <div className="mt-3 h-4 w-4/6 rounded bg-muted" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-4 h-8 w-20 rounded bg-muted" />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-11 rounded-lg bg-muted" />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-11 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
