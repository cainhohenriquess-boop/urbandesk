export default function ProjetosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="h-3 w-40 rounded bg-muted" />
          <div className="mt-4 h-8 w-80 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-4/5 rounded bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="mt-4 h-8 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="h-72 rounded-xl bg-muted lg:col-span-2" />
          <div className="h-72 rounded-xl bg-muted lg:col-span-3" />
        </div>
      </section>
    </div>
  );
}
