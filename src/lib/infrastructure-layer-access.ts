import {
  getAccessBlockMessage,
  getAccessBlockReason,
  type AccessControlUserLike,
} from "@/lib/auth-shared";

export type InfrastructureLayerSessionLike = {
  user: AccessControlUserLike & {
    id?: string | null;
    role?: string | null;
    name?: string | null;
    email?: string | null;
  };
} | null;

export function evaluateInfrastructureUploadAccess(
  session: InfrastructureLayerSessionLike
) {
  if (!session) {
    return {
      allowed: false,
      status: 401,
      payload: {
        error: "Não autenticado.",
      },
    } as const;
  }

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    return {
      allowed: false,
      status: 403,
      payload: {
        error: getAccessBlockMessage(reason),
        code: reason,
      },
    } as const;
  }

  if (session.user.role !== "SUPERADMIN") {
    return {
      allowed: false,
      status: 403,
      payload: {
        error: "Somente superadmin pode publicar camadas elétricas.",
      },
    } as const;
  }

  return {
    allowed: true,
    status: 200,
    payload: null,
  } as const;
}

export function buildInfrastructureLayerTenantWhere(targetTenantId: string) {
  return {
    status: "READY" as const,
    authorizedTenants: {
      some: {
        tenantId: targetTenantId,
      },
    },
  };
}
