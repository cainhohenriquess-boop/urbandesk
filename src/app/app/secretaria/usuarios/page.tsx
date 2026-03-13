"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ManagedRole = "SECRETARIO" | "ENGENHEIRO" | "CAMPO";

interface UserUsage {
  assetLogs: number;
  sessions: number;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: ManagedRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usage?: UserUsage;
}

interface UsersResponse {
  data: UserItem[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  roleSummary: Record<string, number>;
}

interface UserFormState {
  id: string | null;
  name: string;
  email: string;
  role: ManagedRole;
  password: string;
  isActive: boolean;
}

const ROLE_OPTIONS: Array<{ value: ManagedRole; label: string; note: string }> = [
  { value: "SECRETARIO", label: "Secretário", note: "Gestor do tenant (admin local)." },
  { value: "ENGENHEIRO", label: "Engenheiro", note: "Operação técnica e módulo GIS." },
  { value: "CAMPO", label: "Campo", note: "Equipe operacional em campo." },
];

const EMPTY_FORM: UserFormState = {
  id: null,
  name: "",
  email: "",
  role: "ENGENHEIRO",
  password: "",
  isActive: true,
};

function getRoleLabel(role: ManagedRole): string {
  const found = ROLE_OPTIONS.find((option) => option.value === role);
  return found?.label ?? role;
}

function getRoleBadgeClass(role: ManagedRole): string {
  if (role === "SECRETARIO") return "text-brand-700 border-brand-200 bg-brand-50";
  if (role === "ENGENHEIRO") return "text-accent-700 border-accent-200 bg-accent-50";
  return "text-warning-700 border-warning-200 bg-warning-50";
}

function validateForm(form: UserFormState): string | null {
  if (form.name.trim().length < 3) return "Nome deve ter pelo menos 3 caracteres.";

  const email = form.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "E-mail inválido.";
  }

  if (!form.id && form.password.trim().length < 8) {
    return "Senha deve ter no mínimo 8 caracteres.";
  }

  if (form.id && form.password.trim().length > 0 && form.password.trim().length < 8) {
    return "Quando informada, a nova senha deve ter no mínimo 8 caracteres.";
  }

  return null;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [roleSummary, setRoleSummary] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | ManagedRole>("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{
    userName: string;
    temporaryPassword: string;
  } | null>(null);

  const isEditing = !!form.id;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (search.trim()) params.set("q", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (activeFilter === "ACTIVE") params.set("isActive", "true");
      if (activeFilter === "INACTIVE") params.set("isActive", "false");

      const response = await fetch(`/api/users?${params.toString()}`);
      const payload = (await response.json()) as UsersResponse | { error?: string };

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Falha ao carregar usuários.");
      }

      const parsed = payload as UsersResponse;
      setUsers(parsed.data);
      setTotal(parsed.total);
      setPages(parsed.pages);
      setRoleSummary(parsed.roleSummary ?? {});
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários.");
      setUsers([]);
      setTotal(0);
      setPages(1);
      setRoleSummary({});
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, roleFilter, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setTempPasswordInfo(null);

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
        email: form.email.trim().toLowerCase(),
        role: form.role,
        isActive: form.isActive,
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      };

      const endpoint = isEditing ? `/api/users/${form.id}` : "/api/users";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar usuário.");
      }

      setForm(EMPTY_FORM);
      setNotice(isEditing ? "Usuário atualizado com sucesso." : "Usuário criado com sucesso.");
      setPage(1);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: UserItem) => {
    setError(null);
    setNotice(null);
    setTempPasswordInfo(null);
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      isActive: user.isActive,
    });
  };

  const handleToggleActive = async (user: UserItem) => {
    setError(null);
    setNotice(null);
    setTempPasswordInfo(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao atualizar status.");
      }

      setNotice(
        !user.isActive
          ? `Usuário ${user.name} ativado com sucesso.`
          : `Usuário ${user.name} desativado com sucesso.`
      );
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    if (!window.confirm(`Gerar senha temporária para ${user.name}?`)) return;

    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao resetar senha.");
      }

      const temporaryPassword = payload?.data?.temporaryPassword as string | undefined;
      if (!temporaryPassword) {
        throw new Error("Resposta inválida do servidor.");
      }

      setTempPasswordInfo({
        userName: user.name,
        temporaryPassword,
      });
      setNotice(`Senha temporária gerada para ${user.name}.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao resetar senha.");
    }
  };

  const handleDelete = async (user: UserItem) => {
    const usageCount = (user.usage?.assetLogs ?? 0) + (user.usage?.sessions ?? 0);
    const mode = usageCount > 0 ? "soft" : "hard";
    const message =
      mode === "soft"
        ? `Usuário possui histórico (${usageCount} registro(s)). Será desativado (soft delete). Continuar?`
        : "Remover usuário permanentemente?";

    if (!window.confirm(message)) return;

    setError(null);
    setNotice(null);
    setTempPasswordInfo(null);

    try {
      const response = await fetch(`/api/users/${user.id}?mode=${mode}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao remover usuário.");
      }

      if (form.id === user.id) {
        setForm(EMPTY_FORM);
      }

      setNotice(
        payload?.mode === "hard"
          ? `Usuário ${user.name} removido permanentemente.`
          : `Usuário ${user.name} desativado com sucesso.`
      );
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao remover usuário.");
    }
  };

  const activeFilters = useMemo(() => {
    return [
      search.trim() ? `Busca: ${search.trim()}` : null,
      roleFilter !== "ALL" ? `Papel: ${getRoleLabel(roleFilter)}` : null,
      activeFilter !== "ALL"
        ? activeFilter === "ACTIVE"
          ? "Somente ativos"
          : "Somente inativos"
        : null,
    ].filter((item): item is string => !!item);
  }, [activeFilter, roleFilter, search]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-800 text-foreground">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administração de usuários por tenant com controle de papéis e bloqueio de escalonamento.
          </p>
        </div>

        <Link
          href="/app/secretaria"
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
        >
          Voltar ao Dashboard
        </Link>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-sm font-bold text-foreground mb-2">Regras por papel</h2>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>SECRETARIO: administra usuários do próprio tenant.</li>
          <li>ENGENHEIRO: opera GIS e rotinas técnicas, sem acesso administrativo.</li>
          <li>CAMPO: operação em campo, sem acesso administrativo.</li>
          <li>SUPERADMIN não é gerenciável por esta área de tenant.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-sm font-bold text-foreground mb-3">Filtros</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome ou e-mail"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as "ALL" | ManagedRole);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">Todos os papéis</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE");
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">Ativos e inativos</option>
            <option value="ACTIVE">Somente ativos</option>
            <option value="INACTIVE">Somente inativos</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("ALL");
              setActiveFilter("ALL");
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
              <span key={label} className="rounded-full bg-muted px-2 py-1">
                {label}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
          <h2 className="font-display text-sm font-bold text-foreground mb-3">
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome completo"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />

            <input
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              type="email"
              placeholder="E-mail institucional"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />

            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as ManagedRole }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <input
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              type="password"
              placeholder={isEditing ? "Nova senha (opcional)" : "Senha inicial"}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required={!isEditing}
            />

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Usuário ativo
            </label>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {ROLE_OPTIONS.find((item) => item.value === form.role)?.note}
            </div>

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
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-foreground">Usuários ({total})</h2>
              <p className="text-xs text-muted-foreground">
                Secretários: {roleSummary.SECRETARIO ?? 0} | Engenheiros: {roleSummary.ENGENHEIRO ?? 0} | Campo: {roleSummary.CAMPO ?? 0}
              </p>
            </div>

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
            <p className="text-sm text-muted-foreground">Carregando usuários...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado para os filtros aplicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Usuário</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Papel</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Histórico</th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/70">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            user.isActive
                              ? "bg-accent-50 text-accent-700"
                              : "bg-danger-50 text-danger-700"
                          }`}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        logs: {user.usage?.assetLogs ?? 0} | sessões: {user.usage?.sessions ?? 0}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => void handleToggleActive(user)}
                            className={`rounded border px-2 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "border-warning-300 text-warning-700 hover:bg-warning-50"
                                : "border-accent-300 text-accent-700 hover:bg-accent-50"
                            }`}
                          >
                            {user.isActive ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            onClick={() => void handleResetPassword(user)}
                            className="rounded border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                          >
                            Resetar senha
                          </button>
                          <button
                            onClick={() => void handleDelete(user)}
                            className="rounded border border-danger-300 px-2 py-1 text-xs font-semibold text-danger-600 hover:bg-danger-50"
                          >
                            Excluir
                          </button>
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

      {tempPasswordInfo && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          Senha temporária de <strong>{tempPasswordInfo.userName}</strong>:{" "}
          <code className="rounded bg-warning-100 px-2 py-0.5">{tempPasswordInfo.temporaryPassword}</code>
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}
    </div>
  );
}

