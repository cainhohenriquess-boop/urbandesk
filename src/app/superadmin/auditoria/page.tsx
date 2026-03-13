"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AuditUserOption {
  id: string;
  name: string | null;
  email: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string | null; email: string | null } | null;
  tenant?: { id: string; name: string } | null;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  actionSummary: Record<string, number>;
  users: AuditUserOption[];
}

const DEFAULT_LIMIT = 30;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatActionLabel(action: string): string {
  return action.replaceAll("_", " ");
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export default function SuperadminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<AuditUserOption[]>([]);
  const [actionSummary, setActionSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tenantIdFilter, setTenantIdFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(
    () =>
      Object.keys(actionSummary)
        .sort((a, b) => b.localeCompare(a))
        .map((action) => ({ action, count: actionSummary[action] })),
    [actionSummary]
  );

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(DEFAULT_LIMIT),
      });

      if (search.trim()) params.set("q", search.trim());
      if (actionFilter) params.set("action", actionFilter);
      if (userFilter) params.set("userId", userFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (tenantIdFilter.trim()) params.set("tenantId", tenantIdFilter.trim());

      const response = await fetch(`/api/audit?${params.toString()}`);
      const payload = (await response.json()) as AuditResponse | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Falha ao carregar auditoria.");
      }

      const parsed = payload as AuditResponse;
      setLogs(parsed.data);
      setUsers(parsed.users);
      setActionSummary(parsed.actionSummary ?? {});
      setTotal(parsed.total);
      setPages(parsed.pages);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao consultar auditoria.");
      setLogs([]);
      setUsers([]);
      setActionSummary({});
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo, page, search, tenantIdFilter, userFilter]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const activeFilters = useMemo(() => {
    return [
      search.trim() ? `Busca: ${search.trim()}` : null,
      actionFilter ? `Ação: ${actionFilter}` : null,
      userFilter ? `Usuário: ${userFilter}` : null,
      dateFrom ? `De: ${dateFrom}` : null,
      dateTo ? `Até: ${dateTo}` : null,
      tenantIdFilter.trim() ? `Tenant: ${tenantIdFilter.trim()}` : null,
    ].filter((value): value is string => !!value);
  }, [actionFilter, dateFrom, dateTo, search, tenantIdFilter, userFilter]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-800 text-foreground">Trilha de Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico de ações críticas do sistema com filtros por usuário, data e ação.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="mb-3 font-display text-sm font-bold text-foreground">Filtros</h2>
        <div className="grid gap-3 md:grid-cols-6">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Busca livre"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas as ações</option>
            {actions.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action} ({item.count})
              </option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(event) => {
              setUserFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos os usuários</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email ?? user.id}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <input
            value={tenantIdFilter}
            onChange={(event) => {
              setTenantIdFilter(event.target.value);
              setPage(1);
            }}
            placeholder="TenantId (opcional)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => void loadAudit()}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Atualizar
          </button>
          <button
            onClick={() => {
              setSearch("");
              setActionFilter("");
              setUserFilter("");
              setDateFrom("");
              setDateTo("");
              setTenantIdFilter("");
              setPage(1);
            }}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            Limpar
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {activeFilters.map((label) => (
              <span key={label} className="rounded-full bg-muted px-2 py-1">
                {label}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Eventos ({total})</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Página {page} de {pages}
            </span>
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
          <p className="text-sm text-muted-foreground">Carregando auditoria...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento encontrado para os filtros aplicados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Data</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Ação</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Usuário</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Tenant</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Entidade</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/70 align-top">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                        {formatActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <p className="font-semibold text-foreground">
                        {log.userName ?? log.user?.name ?? "-"}
                      </p>
                      <p className="text-muted-foreground">
                        {log.userEmail ?? log.user?.email ?? "-"}
                      </p>
                      <p className="text-muted-foreground">{log.userRole ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <p>{log.tenant?.name ?? "-"}</p>
                      <p className="font-mono text-[10px]">{log.tenantId ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <p>{log.entityType ?? "-"}</p>
                      <p className="font-mono text-[10px]">{log.entityId ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <p>IP: {log.ip ?? "-"}</p>
                      {log.metadata && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-brand-600">metadata</summary>
                          <pre className="mt-1 max-w-[480px] overflow-auto rounded bg-muted p-2 text-[10px]">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}
    </div>
  );
}
