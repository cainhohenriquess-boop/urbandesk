import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const ALLOWED_ROLES = new Set(["SUPERADMIN", "SECRETARIO"]);
const tenantIdSchema = z.string().cuid();

function parseBoundedInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseDateStart(raw: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function parseDateEnd(raw: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

async function resolveAuditScope(req: NextRequest): Promise<
  | { role: string; tenantId: string | null }
  | { response: NextResponse }
> {
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

  const role = session.user.role ?? "";
  if (!ALLOWED_ROLES.has(role)) {
    return { response: NextResponse.json({ error: "Não autorizado" }, { status: 403 }) };
  }

  if (role === "SUPERADMIN") {
    const cookieStore = await cookies();
    const tenantIdFromCookieRaw = cookieStore.get("impersonate_tenant")?.value ?? null;
    const tenantIdFromQueryRaw = req.nextUrl.searchParams.get("tenantId");
    const tenantIdFromCookie = tenantIdFromCookieRaw
      ? tenantIdSchema.safeParse(tenantIdFromCookieRaw).data ?? null
      : null;
    const tenantIdFromQuery = tenantIdFromQueryRaw
      ? tenantIdSchema.safeParse(tenantIdFromQueryRaw).data ?? null
      : null;

    if ((tenantIdFromCookieRaw && !tenantIdFromCookie) || (tenantIdFromQueryRaw && !tenantIdFromQuery)) {
      return {
        response: NextResponse.json({ error: "Tenant inválido para auditoria." }, { status: 400 }),
      };
    }

    return { role, tenantId: tenantIdFromCookie ?? tenantIdFromQuery ?? null };
  }

  const tenantId = session.user.tenantId ?? null;
  if (!tenantId || !tenantIdSchema.safeParse(tenantId).success) {
    return {
      response: NextResponse.json(
        { error: "Tenant não identificado para auditoria." },
        { status: 400 }
      ),
    };
  }

  return { role, tenantId };
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:audit:get",
      limit: 90,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const scope = await resolveAuditScope(req);
    if ("response" in scope) return scope.response;

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const action = searchParams.get("action")?.trim() ?? "";
    const userId = searchParams.get("userId")?.trim() ?? "";
    const dateFrom = parseDateStart(searchParams.get("dateFrom"));
    const dateTo = parseDateEnd(searchParams.get("dateTo"));
    const page = parseBoundedInt(searchParams.get("page"), 1, 1, 10_000);
    const limit = parseBoundedInt(searchParams.get("limit"), 25, 1, 100);

    const where: Prisma.AuditLogWhereInput = {};
    if (scope.tenantId) {
      where.tenantId = scope.tenantId;
    }

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    if (q.length > 0) {
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { entityType: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { userName: { contains: q, mode: "insensitive" } },
        { userEmail: { contains: q, mode: "insensitive" } },
      ];
    }

    const scopeWhere: Prisma.AuditLogWhereInput = {};
    if (scope.tenantId) {
      scopeWhere.tenantId = scope.tenantId;
    }

    const [logs, total, groupedActions, rawUsers] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where: {
          ...scopeWhere,
          userId: { not: null },
        },
        select: {
          userId: true,
          userName: true,
          userEmail: true,
        },
        distinct: ["userId"],
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const actionSummary = groupedActions.reduce<Record<string, number>>((acc, row: { action: string; _count: { _all: number } }) => {
      acc[row.action] = row._count._all;
      return acc;
    }, {});

    const users = rawUsers
      .filter((item: { userId: string | null; userName: string | null; userEmail: string | null }): item is { userId: string; userName: string | null; userEmail: string | null } => !!item.userId)
      .map((item: { userId: string; userName: string | null; userEmail: string | null }) => ({
        id: item.userId,
        name: item.userName ?? null,
        email: item.userEmail ?? null,
      }));

    return NextResponse.json({
      data: logs,
      total,
      page,
      perPage: limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      actionSummary,
      users,
      scope: {
        role: scope.role,
        tenantId: scope.tenantId,
      },
    });
  } catch (error) {
    console.error("[AUDIT_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
