import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";

// ─────────────────────────────────────────────
// Schemas de Validação (Zod)
// ─────────────────────────────────────────────
const createTenantSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres").max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "Slug inválido."),
  cnpj: z.string().trim().regex(/^\d{14}$/, "O CNPJ deve conter 14 dígitos numéricos."),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "O estado deve ter 2 letras."),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]).optional().default("STARTER"),
  trialDays: z.number().int().min(1).optional().default(14),
}).strict();

const updateTenantSchema = z.object({
  id: z.string().cuid("O ID do tenant é inválido"),
  name: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(["TRIAL", "ATIVO", "INADIMPLENTE", "CANCELADO"]).optional(),
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]).optional(),
}).strict();

// ─────────────────────────────────────────────
// GET /api/tenant — Lista todos os tenants (SuperAdmin)
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:tenant:get",
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json({ error: getAccessBlockMessage(reason), code: reason }, { status: 403 });
    }
    if (session.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("filter");
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(100, Number(searchParams.get("limit") ?? 20));

    if (status && !["TRIAL", "ATIVO", "INADIMPLENTE", "CANCELADO"].includes(status.toUpperCase())) {
      return NextResponse.json({ error: "Parâmetro filter inválido." }, { status: 400 });
    }

    const where = status ? { status: status.toUpperCase() as any } : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { users: true, projects: true, assets: true } } },
      }),
      prisma.tenant.count({ where }),
    ]);

    return NextResponse.json({
      data:    tenants,
      total,
      page,
      perPage: limit,
      pages:   Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[TENANT_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/tenant — Cria novo tenant (SuperAdmin)
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:tenant:post",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json({ error: getAccessBlockMessage(reason), code: reason }, { status: 403 });
    }
    if (session.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsedData = createTenantSchema.parse(body); // Lança erro se for inválido

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + parsedData.trialDays);

    const tenant = await prisma.tenant.create({
      data: {
        name: parsedData.name,
        slug: parsedData.slug,
        cnpj: parsedData.cnpj,
        state: parsedData.state,
        plan: parsedData.plan,
        status: "TRIAL",
        trialEndsAt,
      },
    });

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[TENANT_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/tenant — Atualiza tenant (SuperAdmin)
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:tenant:patch",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json({ error: getAccessBlockMessage(reason), code: reason }, { status: 403 });
    }
    if (session.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsedData = updateTenantSchema.parse(body);

    const { id, ...dataToUpdate } = parsedData;
    const previous = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });

    if (!previous) {
      return NextResponse.json({ error: "Tenant não encontrado." }, { status: 404 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: dataToUpdate,
    });

    if (parsedData.status && previous.status !== tenant.status) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.TENANT_STATUS_CHANGE,
        entityType: "tenant",
        entityId: tenant.id,
        actor: {
          userId: session.user.id ?? null,
          userName: session.user.name ?? null,
          userEmail: session.user.email ?? null,
          userRole: session.user.role ?? null,
          tenantId: tenant.id,
        },
        requestContext: extractRequestContext(req),
        metadata: {
          tenantName: tenant.name,
          previousStatus: previous.status,
          nextStatus: tenant.status,
        },
      });
    }

    return NextResponse.json({ data: tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[TENANT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
