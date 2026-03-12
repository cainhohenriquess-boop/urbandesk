import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccessBlockMessage,
  getAccessBlockReason,
  type AppRole,
} from "@/lib/auth-shared";

export const TENANT_MANAGED_ROLES = ["SECRETARIO", "ENGENHEIRO", "CAMPO"] as const;
export type TenantManagedRole = (typeof TENANT_MANAGED_ROLES)[number];

const TENANT_MANAGED_ROLE_SET = new Set<string>(TENANT_MANAGED_ROLES);
const ALLOWED_MANAGER_ROLES = new Set<AppRole>(["SUPERADMIN", "SECRETARIO"]);

export interface UserAdminContext {
  userId: string;
  role: AppRole;
  tenantId: string;
}

export function isTenantManagedRole(value: string): value is TenantManagedRole {
  return TENANT_MANAGED_ROLE_SET.has(value);
}

export async function resolveUserAdminContext(
  req: NextRequest
): Promise<UserAdminContext | { response: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { response: NextResponse.json({ error: "Nao autenticado" }, { status: 401 }) };
  }

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    return {
      response: NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      ),
    };
  }

  const role = session.user.role as AppRole | undefined;
  if (!role || !ALLOWED_MANAGER_ROLES.has(role)) {
    return { response: NextResponse.json({ error: "Nao autorizado" }, { status: 403 }) };
  }

  const cookieStore = await cookies();
  const queryTenantId = req.nextUrl.searchParams.get("tenantId");

  let tenantId = session.user.tenantId ?? null;
  if (role === "SUPERADMIN") {
    tenantId = cookieStore.get("impersonate_tenant")?.value ?? queryTenantId ?? tenantId;
  }

  if (!tenantId) {
    return {
      response: NextResponse.json(
        { error: "Tenant nao identificado para operacao." },
        { status: 400 }
      ),
    };
  }

  const userId = session.user.id ?? "";
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Sessao invalida: usuario sem identificador." },
        { status: 401 }
      ),
    };
  }

  return { userId, role, tenantId };
}
