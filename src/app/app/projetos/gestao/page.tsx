"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProjectStatus = "PLANEJADO" | "EM_ANDAMENTO" | "PARALISADO" | "CONCLUIDO" | "CANCELADO";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  completionPct: number;
  geomWkt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { assets: number };
}

interface ProjectsResponse {
  data: ProjectItem[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

interface ProjectFormState {
  id: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  budget: string;
  startDate: string;
  endDate: string;
  completionPct: string;
  geomWkt: string;
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "PLANEJADO", label: "Planejado" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "PARALISADO", label: "Paralisado" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
];

const EMPTY_FORM: ProjectFormState = {
  id: null,
  name: "",
  description: "",
  status: "PLANEJADO",
  budget: "",
  startDate: "",
  endDate: "",
  completionPct: "0",
  geomWkt: "",
};

function formatDateInput(raw: string | null): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function validateForm(form: ProjectFormState): string | null {
  if (form.name.trim().length < 3) return "Nome deve ter pelo menos 3 caracteres.";

  const completion = Number(form.completionPct);
  if (!Number.isFinite(completion) || !Number.isInteger(completion) || completion < 0 || completion > 100) {
    return "Percentual deve ser inteiro entre 0 e 100.";
  }

  if (form.startDate && form.endDate && new Date(form.endDate).getTime() < new Date(form.startDate).getTime()) {
    return "Data final não pode ser anterior à data inicial.";
  }

  if (form.budget && (!Number.isFinite(Number(form.budget)) || Number(form.budget) < 0)) {
    return "Orçamento inválido.";
  }

  return null;
}

export default function ProjetosGestaoPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProjectStatus>("ALL");
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);

  const isEditing = !!form.id;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        includeCancelled: includeCancelled ? "true" : "false",
      });

      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const response = await fetch(`/api/projects?${params.toString()}`);
      const payload = (await response.json()) as ProjectsResponse | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Falha ao carregar projetos.");
      }

      const parsed = payload as ProjectsResponse;
      setProjects(parsed.data);
      setTotal(parsed.total);
      setPages(parsed.pages);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar projetos.");
      setProjects([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [includeCancelled, page, search, statusFilter]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        budget: form.budget.trim() ? Number(form.budget) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        completionPct: Number(form.completionPct),
        geomWkt: form.geomWkt.trim() || null,
      };

      const endpoint = isEditing ? `/api/projects/${form.id}` : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar projeto.");
      }

      setForm(EMPTY_FORM);
      setPage(1);
      await loadProjects();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar projeto.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project: ProjectItem) => {
    setForm({
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      budget: project.budget === null ? "" : String(project.budget),
      startDate: formatDateInput(project.startDate),
      endDate: formatDateInput(project.endDate),
      completionPct: String(project.completionPct),
      geomWkt: project.geomWkt ?? "",
    });
    setError(null);
  };

  const handleDelete = async (project: ProjectItem) => {
    const assetsCount = project._count?.assets ?? 0;
    const safeMode = assetsCount > 0 ? "soft" : "hard";
    const confirmation =
      safeMode === "soft"
        ? `Este projeto possui ${assetsCount} ativo(s). Ele será cancelado (soft delete). Continuar?`
        : "Excluir projeto definitivamente?";

    if (!window.confirm(confirmation)) return;

    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}?mode=${safeMode}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao excluir projeto.");
      }

      if (form.id === project.id) {
        setForm(EMPTY_FORM);
      }

      await loadProjects();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao excluir projeto.");
    }
  };

  const activeFilters = useMemo(() => {
    return [
      search.trim() ? `Busca: ${search.trim()}` : null,
      statusFilter !== "ALL" ? `Status: ${statusFilter}` : null,
      includeCancelled ? "Inclui cancelados" : null,
    ].filter((item): item is string => !!item);
  }, [includeCancelled, search, statusFilter]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-800 text-foreground">Gestão de Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">CRUD completo com isolamento por tenant e exclusão segura.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/app/projetos" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
            Voltar ao GIS
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-sm font-bold text-foreground mb-3">Filtros</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome/descrição"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "ALL" | ProjectStatus);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(event) => {
                setIncludeCancelled(event.target.checked);
                setPage(1);
              }}
            />
            Incluir cancelados
          </label>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setIncludeCancelled(false);
              setPage(1);
            }}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            Limpar filtros
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {activeFilters.map((label) => (
              <span key={label} className="rounded-full bg-muted px-2 py-1">{label}</span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
          <h2 className="font-display text-sm font-bold text-foreground mb-3">{isEditing ? "Editar Projeto" : "Novo Projeto"}</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome do projeto"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />

            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descrição"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ProjectStatus }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>

              <input
                value={form.completionPct}
                onChange={(event) => setForm((prev) => ({ ...prev, completionPct: event.target.value }))}
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="% conclusão"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <input
              value={form.budget}
              onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
              type="number"
              min={0}
              step="0.01"
              placeholder="Orçamento (R$)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                type="date"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                type="date"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <textarea
              value={form.geomWkt}
              onChange={(event) => setForm((prev) => ({ ...prev, geomWkt: event.target.value }))}
              placeholder="GeomWkt (opcional)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs min-h-[80px] font-mono"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {saving ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setError(null);
                }}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-bold text-foreground">Projetos ({total})</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Página {page} de {pages}</span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
              >
                ◀
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
              >
                ▶
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando projetos...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projeto encontrado para os filtros aplicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Projeto</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Orçamento</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Ativos</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-border/70">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-foreground">{project.name}</p>
                        {project.description && <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">{project.status}</td>
                      <td className="px-3 py-2">{formatCurrency(project.budget)}</td>
                      <td className="px-3 py-2">{project._count?.assets ?? 0}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleEdit(project)}
                            className="rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => void handleDelete(project)}
                            className="rounded border border-danger-300 px-2 py-1 text-xs font-semibold text-danger-600 hover:bg-danger-50"
                          >
                            Excluir
                          </button>
                          <Link
                            href={`/app/projetos?projectId=${project.id}`}
                            className="rounded border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                          >
                            Abrir no mapa
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}
    </div>
  );
}
