import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccessBlockMessage,
  getAccessBlockReason,
  type AppRole,
} from "@/lib/auth-shared";
import { z } from "zod";

export const TENANT_MANAGED_ROLES = ["SECRETARIO", "ENGENHEIRO", "CAMPO"] as const;
export type TenantManagedRole = (typeof TENANT_MANAGED_ROLES)[number];

const TENANT_MANAGED_ROLE_SET = new Set<string>(TENANT_MANAGED_ROLES);
const ALLOWED_MANAGER_ROLES = new Set<AppRole>(["SUPERADMIN", "SECRETARIO"]);
const tenantIdSchema = z.string().cuid();

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
    return { response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
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
    return { response: NextResponse.json({ error: "Não autorizado" }, { status: 403 }) };
  }

  const cookieStore = await cookies();
  const queryTenantIdRaw = req.nextUrl.searchParams.get("tenantId");
  const queryTenantId = queryTenantIdRaw
    ? tenantIdSchema.safeParse(queryTenantIdRaw).data ?? null
    : null;
  if (queryTenantIdRaw && !queryTenantId) {
    return {
      response: NextResponse.json(
        { error: "Tenant inválido na query." },
        { status: 400 }
      ),
    };
  }

  let tenantId = session.user.tenantId ?? null;
  if (role === "SUPERADMIN") {
    const impersonatedRaw = cookieStore.get("impersonate_tenant")?.value ?? null;
    const impersonatedTenantId = impersonatedRaw
      ? tenantIdSchema.safeParse(impersonatedRaw).data ?? null
      : null;
    if (impersonatedRaw && !impersonatedTenantId) {
      return {
        response: NextResponse.json(
          { error: "Tenant inválido no cookie de impersonação." },
          { status: 400 }
        ),
      };
    }

    tenantId = impersonatedTenantId ?? queryTenantId ?? tenantId;
  }

  if (tenantId && !tenantIdSchema.safeParse(tenantId).success) {
    return {
      response: NextResponse.json(
        { error: "Tenant inválido na sessão." },
        { status: 400 }
      ),
    };
  }

  if (!tenantId) {
    return {
      response: NextResponse.json(
        { error: "Tenant não identificado para operação." },
        { status: 400 }
      ),
    };
  }

  const userId = session.user.id ?? "";
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Sessão inválida: usuário sem identificador." },
        { status: 401 }
      ),
    };
  }

  return { userId, role, tenantId };
}
