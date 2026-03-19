import { getServerSession, type Session } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";

const tenantIdSchema = z.string().cuid();
const CAMPO_ALLOWED_ROLES = new Set(["SUPERADMIN", "SECRETARIO", "ENGENHEIRO", "CAMPO"]);

export type CampoRequestContext =
  | {
      session: Session;
      tenantId: string;
    }
  | { response: NextResponse };

export async function resolveCampoRequestContext(
  req: NextRequest
): Promise<CampoRequestContext> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      response: NextResponse.json({ error: "N\u00e3o autenticado" }, { status: 401 }),
    };
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

  if (!CAMPO_ALLOWED_ROLES.has(session.user.role ?? "")) {
    return {
      response: NextResponse.json({ error: "N\u00e3o autorizado" }, { status: 403 }),
    };
  }

  let tenantId = session.user.tenantId ?? null;

  if (session.user.role === "SUPERADMIN") {
    const cookieStore = await cookies();
    const rawTenantId = cookieStore.get("impersonate_tenant")?.value ?? null;
    if (rawTenantId) {
      const parsed = tenantIdSchema.safeParse(rawTenantId);
      if (!parsed.success) {
        return {
          response: NextResponse.json({ error: "Tenant inv\u00e1lido." }, { status: 400 }),
        };
      }
      tenantId = parsed.data;
    }
  }

  if (!tenantId || !tenantIdSchema.safeParse(tenantId).success) {
    return {
      response: NextResponse.json({ error: "Tenant n\u00e3o identificado." }, { status: 400 }),
    };
  }

  return { session, tenantId };
}
