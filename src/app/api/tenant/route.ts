import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET /api/tenant — Lista todos os tenants (SuperAdmin)
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("filter");
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = Math.min(100, Number(searchParams.get("limit") ?? 20));

  const where = status
    ? { status: status.toUpperCase() as any }
    : {};

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
}

// ─────────────────────────────────────────────
// POST /api/tenant — Cria novo tenant (SuperAdmin)
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { name, slug, cnpj, state, plan, trialDays = 14 } = body;

  if (!name || !slug || !cnpj || !state) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      cnpj,
      state,
      plan: plan ?? "STARTER",
      status: "TRIAL",
      trialEndsAt,
    },
  });

  return NextResponse.json({ data: tenant }, { status: 201 });
}

// ─────────────────────────────────────────────
// PATCH /api/tenant — Atualiza tenant (SuperAdmin)
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "ID do tenant é obrigatório" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data,
  });

  return NextResponse.json({ data: tenant });
}
