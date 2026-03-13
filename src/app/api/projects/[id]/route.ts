import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";
import {
  PROJECT_PRIORITY_VALUES,
  PROJECT_STATUS_VALUES,
  PROJECT_TYPE_VALUES,
} from "@/lib/project-portfolio";
import { getProjectSchemaCompatibility } from "@/lib/project-schema-compat";

const ALLOWED_ROLES = new Set(["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"]);
const tenantIdSchema = z.string().cuid();
const projectIdSchema = z.string().cuid();

const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.date().nullable()
);

const nullableNumberSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().finite().nonnegative().nullable()
);

const nullableTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(max).nullable()
  );

const updateProjectSchema = z
  .object({
    code: nullableTrimmedString(40).optional(),
    name: z.string().trim().min(3).max(140).optional(),
    description: nullableTrimmedString(2000).optional(),
    status: z.enum(PROJECT_STATUS_VALUES).optional(),
    projectType: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? null : value),
      z.enum(PROJECT_TYPE_VALUES).nullable()
    ).optional(),
    responsibleDepartment: nullableTrimmedString(120).optional(),
    neighborhood: nullableTrimmedString(120).optional(),
    priority: z.enum(PROJECT_PRIORITY_VALUES).optional(),
    estimatedBudget: nullableNumberSchema.optional(),
    plannedStartDate: nullableDateSchema.optional(),
    plannedEndDate: nullableDateSchema.optional(),
    completionPct: z.coerce.number().int().min(0).max(100).optional(),
    geomWkt: z.string().trim().max(120000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

function serializeProject(project: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: string;
  projectType: string | null;
  responsibleDepartment: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  priority: string;
  budget: Prisma.Decimal | null;
  estimatedBudget: Prisma.Decimal | null;
  startDate: Date | null;
  endDate: Date | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  completionPct: number;
  physicalProgressPct: number;
  operationalStatus: string;
  geomWkt: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assets: number };
}) {
  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
    estimatedBudget: project.estimatedBudget ? Number(project.estimatedBudget) : null,
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

  const cookieStore = await cookies();
  const queryTenantIdRaw = req.nextUrl.searchParams.get("tenantId");
  const queryTenantId = queryTenantIdRaw
    ? tenantIdSchema.safeParse(queryTenantIdRaw).data ?? null
    : null;
  if (queryTenantIdRaw && !queryTenantId) {
    return {
      response: NextResponse.json({ error: "Tenant inválido na query." }, { status: 400 }),
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
        response: NextResponse.json({ error: "Tenant inválido no cookie." }, { status: 400 }),
      };
    }
    tenantId = impersonatedTenantId ?? queryTenantId ?? tenantId;
  }

  if (!tenantId || !tenantIdSchema.safeParse(tenantId).success) {
    return {
      response: NextResponse.json({ error: "Tenant não identificado para operação." }, { status: 400 }),
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
    return "Data final não pode ser anterior à data inicial.";
  }
  return null;
}

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectRouteContext): Promise<string> {
  const params = await context.params;
  if (typeof params.id !== "string") return "";
  const parsed = projectIdSchema.safeParse(params.id);
  return parsed.success ? parsed.data : "";
}

async function validateDuplicateProject(
  tenantId: string,
  payload: { name?: string; code?: string | null },
  excludeId: string
) {
  if (payload.name !== undefined) {
    const duplicateByName = await prisma.project.findFirst({
      where: {
        tenantId,
        id: { not: excludeId },
        name: { equals: payload.name, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicateByName) {
      return "Já existe um projeto com este nome neste tenant.";
    }
  }

  if (payload.code) {
    const duplicateByCode = await prisma.project.findFirst({
      where: {
        tenantId,
        id: { not: excludeId },
        code: { equals: payload.code, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicateByCode) {
      return "Já existe um projeto com este código neste tenant.";
    }
  }

  return null;
}

export async function GET(req: NextRequest, context: ProjectRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:id:get",
      limit: 180,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const tenantContext = await resolveTenantContext(req);
    if ("response" in tenantContext) return tenantContext.response;

    const projectSchema = await getProjectSchemaCompatibility();
    if (!projectSchema.executiveSchemaReady) {
      return NextResponse.json(
        {
          error:
            projectSchema.notice ??
            "A base de dados ainda não recebeu a migration estrutural do módulo Projetos.",
          code: "project_schema_legacy",
        },
        { status: 503 }
      );
    }

    const id = await resolveProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de projeto inválido" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: serializeProject(project) });
  } catch (error) {
    console.error("[PROJECT_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: ProjectRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:id:patch",
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const tenantContext = await resolveTenantContext(req);
    if ("response" in tenantContext) return tenantContext.response;

    const projectSchema = await getProjectSchemaCompatibility();
    if (!projectSchema.executiveSchemaReady) {
      return NextResponse.json(
        {
          error:
            projectSchema.notice ??
            "A base de dados ainda não recebeu a migration estrutural do módulo Projetos.",
          code: "project_schema_legacy",
        },
        { status: 503 }
      );
    }

    const id = await resolveProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de projeto inválido" }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const payload = updateProjectSchema.parse(body);

    const nextStartDate =
      payload.plannedStartDate !== undefined ? payload.plannedStartDate : existing.plannedStartDate;
    const nextEndDate =
      payload.plannedEndDate !== undefined ? payload.plannedEndDate : existing.plannedEndDate;

    const dateError = validateProjectDates(nextStartDate, nextEndDate);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const duplicateMessage = await validateDuplicateProject(
      tenantContext.tenantId,
      {
        name: payload.name,
        code: payload.code ?? undefined,
      },
      existing.id
    );
    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 409 });
    }

    const estimatedBudget =
      payload.estimatedBudget === undefined
        ? undefined
        : payload.estimatedBudget === null
          ? null
          : new Prisma.Decimal(payload.estimatedBudget);

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.projectType !== undefined ? { projectType: payload.projectType } : {}),
        ...(payload.responsibleDepartment !== undefined
          ? { responsibleDepartment: payload.responsibleDepartment }
          : {}),
        ...(payload.neighborhood !== undefined ? { neighborhood: payload.neighborhood } : {}),
        ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
        ...(estimatedBudget !== undefined
          ? { estimatedBudget, budget: estimatedBudget }
          : {}),
        ...(payload.plannedStartDate !== undefined
          ? { plannedStartDate: payload.plannedStartDate, startDate: payload.plannedStartDate }
          : {}),
        ...(payload.plannedEndDate !== undefined
          ? { plannedEndDate: payload.plannedEndDate, endDate: payload.plannedEndDate }
          : {}),
        ...(payload.completionPct !== undefined
          ? {
              completionPct: payload.completionPct,
              physicalProgressPct: payload.completionPct,
            }
          : {}),
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
        previousCode: existing.code,
        nextCode: updated.code,
      },
    });

    return NextResponse.json({ data: serializeProject(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.issues }, { status: 400 });
    }

    console.error("[PROJECT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: ProjectRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:id:delete",
      limit: 40,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const tenantContext = await resolveTenantContext(req);
    if ("response" in tenantContext) return tenantContext.response;

    const projectSchema = await getProjectSchemaCompatibility();
    if (!projectSchema.executiveSchemaReady) {
      return NextResponse.json(
        {
          error:
            projectSchema.notice ??
            "A base de dados ainda não recebeu a migration estrutural do módulo Projetos.",
          code: "project_schema_legacy",
        },
        { status: 503 }
      );
    }

    const id = await resolveProjectId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de projeto inválido" }, { status: 400 });
    }
    const mode = req.nextUrl.searchParams.get("mode");

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
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
