export type AppRole = "SUPERADMIN" | "SECRETARIO" | "ENGENHEIRO" | "CAMPO";
export type TenantLifecycleStatus = "TRIAL" | "ATIVO" | "INADIMPLENTE" | "CANCELADO";

export type AccessBlockReason =
  | "user_inactive"
  | "tenant_missing"
  | "tenant_inactive"
  | "trial_expired";

export interface AccessControlUserLike {
  role?: string | null;
  isActive?: boolean | null;
  tenantId?: string | null;
  tenantStatus?: string | null;
  trialEndsAt?: string | Date | null;
}

export function getRoleHome(role?: string | null): string {
  if (role === "SUPERADMIN") return "/superadmin";
  if (role === "ENGENHEIRO") return "/app/projetos";
  if (role === "CAMPO") return "/app/campo";
  return "/app/secretaria";
}

export function isTenantInactive(status?: string | null): boolean {
  return status === "INADIMPLENTE" || status === "CANCELADO";
}

export function isTrialExpired(status?: string | null, trialEndsAt?: string | Date | null): boolean {
  if (status !== "TRIAL" || !trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < Date.now();
}

export function getAccessBlockReason(user: AccessControlUserLike): AccessBlockReason | null {
  if (user.isActive === false) return "user_inactive";

  // SUPERADMIN nunca bloqueia por tenant/trial (somente por inatividade do próprio usuário).
  if (user.role === "SUPERADMIN") return null;

  if (!user.tenantId) return "tenant_missing";
  if (isTenantInactive(user.tenantStatus)) return "tenant_inactive";
  if (isTrialExpired(user.tenantStatus, user.trialEndsAt)) return "trial_expired";

  return null;
}

export function getAccessBlockMessage(reason: AccessBlockReason): string {
  if (reason === "user_inactive") return "Usuário inativo.";
  if (reason === "tenant_missing") return "Tenant não associado ao usuário.";
  if (reason === "tenant_inactive") return "Tenant inativo.";
  return "Período de trial expirado.";
}
