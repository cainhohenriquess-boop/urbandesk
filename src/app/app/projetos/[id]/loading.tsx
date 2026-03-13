export default function ProjetoLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="rounded-2xl border border-border bg-card px-6 py-5 shadow-card">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="mt-4 h-8 w-72 rounded bg-muted" />
        <div className="mt-3 h-4 w-full rounded bg-muted" />
        <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-2 shadow-card">
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-10 w-28 rounded-xl bg-muted" />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="h-64 rounded-xl bg-muted" />
      </section>
    </div>
  );
}
