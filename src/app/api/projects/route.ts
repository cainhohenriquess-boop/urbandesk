import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { Prisma, ProjectStatus } from "@prisma/client";
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

const createProjectSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(140),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional().default("PLANEJADO"),
  budget: nullableNumberSchema.optional(),
  startDate: nullableDateSchema.optional(),
  endDate: nullableDateSchema.optional(),
  completionPct: z.coerce.number().int().min(0).max(100).optional().default(0),
  geomWkt: z.string().trim().max(120000).nullable().optional(),
});

function serializeProject(project: {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
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

function isValidStatus(value: string | null): value is ProjectStatus {
  return !!value && (PROJECT_STATUSES as readonly string[]).includes(value);
}

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

export async function GET(req: NextRequest) {
  try {
    const context = await resolveTenantContext(req);
    if ("response" in context) return context.response;

    const { tenantId } = context;
    const searchParams = req.nextUrl.searchParams;

    const q = searchParams.get("q")?.trim() ?? "";
    const statusParam = searchParams.get("status");
    const includeCancelled = searchParams.get("includeCancelled") === "true";
    const page = parseBoundedInt(searchParams.get("page"), 1, 1, 10_000);
    const limit = parseBoundedInt(searchParams.get("limit"), 25, 1, 100);

    const where: Prisma.ProjectWhereInput = { tenantId };

    if (isValidStatus(statusParam)) {
      where.status = statusParam;
    } else if (!includeCancelled) {
      where.status = { not: "CANCELADO" };
    }

    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [projects, total, grouped] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        include: { _count: { select: { assets: true } } },
      }),
      prisma.project.count({ where }),
      prisma.project.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true },
      }),
    ]);

    const statusSummary = grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return NextResponse.json({
      data: projects.map((project) => serializeProject(project)),
      total,
      page,
      perPage: limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      statusSummary,
    });
  } catch (error) {
    console.error("[PROJECTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveTenantContext(req);
    if ("response" in context) return context.response;

    const body = await req.json();
    const payload = createProjectSchema.parse(body);

    const dateError = validateProjectDates(payload.startDate, payload.endDate);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const duplicate = await prisma.project.findFirst({
      where: {
        tenantId: context.tenantId,
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

    const created = await prisma.project.create({
      data: {
        tenantId: context.tenantId,
        name: payload.name,
        description: payload.description ?? null,
        status: payload.status,
        budget: payload.budget === null || payload.budget === undefined ? null : new Prisma.Decimal(payload.budget),
        startDate: payload.startDate ?? null,
        endDate: payload.endDate ?? null,
        completionPct: payload.completionPct,
        geomWkt: payload.geomWkt ?? null,
      },
      include: { _count: { select: { assets: true } } },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_CREATE,
      entityType: "project",
      entityId: created.id,
      actor: {
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        userRole: context.role,
        tenantId: context.tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        name: created.name,
        status: created.status,
      },
    });

    return NextResponse.json({ data: serializeProject(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalido", details: error.issues }, { status: 400 });
    }

    console.error("[PROJECTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
