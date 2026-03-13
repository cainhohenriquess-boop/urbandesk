import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";

const PROJECT_STATUSES = ["PLANEJADO", "EM_ANDAMENTO", "PARALISADO", "CONCLUIDO", "CANCELADO"] as const;
const ALLOWED_ROLES = new Set(["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"]);

const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.date().nullable()
);

const nullableNumberSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().finite().nonnegative().nullable()
);

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(3).max(140).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    budget: nullableNumberSchema.optional(),
    startDate: nullableDateSchema.optional(),
    endDate: nullableDateSchema.optional(),
    completionPct: z.coerce.number().int().min(0).max(100).optional(),
    geomWkt: z.string().trim().max(120000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

function serializeProject(project: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: Prisma.Decimal | null;
  startDate: Date | null;
  endDate: Date | null;
  completionPct: number;
  geomWkt: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assets: number };
}) {
  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
  };
}

async function resolveTenantContext(req: NextRequest): Promise<
  | {
      tenantId: string;
      role: string;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
    }
  | { response: NextResponse }
> {
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

  const role = session.user.role ?? "";
  if (!ALLOWED_ROLES.has(role)) {
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
      response: NextResponse.json({ error: "Tenant nao identificado para operacao." }, { status: 400 }),
    };
  }

  return {
    tenantId,
    role,
    userId: session.user.id ?? null,
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
  };
}

function validateProjectDates(startDate: Date | null | undefined, endDate: Date | null | undefined): string | null {
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return "Data final nao pode ser anterior a data inicial.";
  }
  return null;
}

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectRouteContext): Promise<string> {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

export async function GET(req: NextRequest, context: ProjectRouteContext) {
  try {
    const tenantContext = await resolveTenantContext(req);
    if ("response" in tenantContext) return tenantContext.response;

    const id = await resolveProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de projeto invalido" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: serializeProject(project) });
  } catch (error) {
    console.error("[PROJECT_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: ProjectRouteContext) {
  try {
    const tenantContext = await resolveTenantContext(req);
    if ("response" in tenantContext) return tenantContext.response;

    const id = await resolveProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de projeto invalido" }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const payload = updateProjectSchema.parse(body);

    const nextStartDate = payload.startDate !== undefined ? payload.startDate : existing.startDate;
    const nextEndDate = payload.endDate !== undefined ? payload.endDate : existing.endDate;

    const dateError = validateProjectDates(nextStartDate, nextEndDate);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    if (payload.name !== undefined) {
      const duplicate = await prisma.project.findFirst({
        where: {
          tenantId: tenantContext.tenantId,
          id: { not: existing.id },
          name: { equals: payload.name, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Ja existe um projeto com este nome neste tenant." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.budget !== undefined
          ? {
              budget:
                payload.budget === null
                  ? null
                  : new Prisma.Decimal(payload.budget),
            }
          : {}),
        ...(payload.startDate !== undefined ? { startDate: payload.startDate } : {}),
        ...(payload.endDate !== undefined ? { endDate: payload.endDate } : {}),
        ...(payload.completionPct !== undefined ? { completionPct: payload.completionPct } : {}),
        ...(payload.geomWkt !== undefined ? { geomWkt: payload.geomWkt } : {}),
      },
      include: { _count: { select: { assets: true } } },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_UPDATE,
      entityType: "project",
      entityId: updated.id,
      actor: {
        userId: tenantContext.userId,
        userName: tenantContext.userName,
        userEmail: tenantContext.userEmail,
        userRole: tenantContext.role,
        tenantId: tenantContext.tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        changedFields: Object.keys(payload),
        previousStatus: existing.status,
        nextStatus: updated.status,
      },
    });

    return NextResponse.json({ data: serializeProject(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalido", details: error.issues }, { status: 400 });
    }

    console.error("[PROJECT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: ProjectRouteContext) {
  try {
    const tenantContext = await resolveTenantContext(req);
    if ("response" in tenantContext) return tenantContext.response;

    const id = await resolveProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de projeto invalido" }, { status: 400 });
    }
    const mode = req.nextUrl.searchParams.get("mode");

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
    }

    const mustSoftDelete = existing._count.assets > 0 || mode === "soft";

    if (mustSoftDelete) {
      const updated = await prisma.project.update({
        where: { id: existing.id },
        data: {
          status: "CANCELADO",
          completionPct: existing.status === "CONCLUIDO" ? 100 : existing.completionPct,
        },
        include: { _count: { select: { assets: true } } },
      });

      await writeAuditLog({
        action: AUDIT_ACTIONS.PROJECT_DELETE_SOFT,
        entityType: "project",
        entityId: updated.id,
        actor: {
          userId: tenantContext.userId,
          userName: tenantContext.userName,
          userEmail: tenantContext.userEmail,
          userRole: tenantContext.role,
          tenantId: tenantContext.tenantId,
        },
        requestContext: extractRequestContext(req),
        metadata: {
          previousStatus: existing.status,
          nextStatus: updated.status,
          assetsCount: existing._count.assets,
          mode: mode ?? null,
        },
      });

      return NextResponse.json({
        mode: "soft",
        reason: existing._count.assets > 0 ? "Projeto possui ativos vinculados." : "Soft delete solicitado.",
        data: serializeProject(updated),
      });
    }

    await prisma.project.delete({ where: { id: existing.id } });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_DELETE_HARD,
      entityType: "project",
      entityId: existing.id,
      actor: {
        userId: tenantContext.userId,
        userName: tenantContext.userName,
        userEmail: tenantContext.userEmail,
        userRole: tenantContext.role,
        tenantId: tenantContext.tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        previousStatus: existing.status,
        assetsCount: existing._count.assets,
      },
    });

    return NextResponse.json({ mode: "hard", success: true });
  } catch (error) {
    console.error("[PROJECT_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
