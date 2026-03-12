import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  TENANT_MANAGED_ROLES,
  isTenantManagedRole,
  resolveUserAdminContext,
} from "@/lib/user-admin";

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail invalido")
    .max(180),
  role: z.enum(TENANT_MANAGED_ROLES),
  password: z.string().min(8, "Senha deve ter no minimo 8 caracteres").max(72),
  isActive: z.boolean().optional().default(true),
});

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

function parseActiveFilter(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assetLogs: number; sessions: number };
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    tenantId: user.tenantId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    usage: user._count
      ? {
          assetLogs: user._count.assetLogs,
          sessions: user._count.sessions,
        }
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const context = await resolveUserAdminContext(req);
    if ("response" in context) return context.response;

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const roleParam = searchParams.get("role");
    const isActiveParam = parseActiveFilter(searchParams.get("isActive"));
    const page = parseBoundedInt(searchParams.get("page"), 1, 1, 10_000);
    const limit = parseBoundedInt(searchParams.get("limit"), 20, 1, 100);

    const where: Prisma.UserWhereInput = {
      tenantId: context.tenantId,
      role: { in: [...TENANT_MANAGED_ROLES] },
    };

    if (roleParam && isTenantManagedRole(roleParam)) {
      where.role = roleParam;
    }

    if (typeof isActiveParam === "boolean") {
      where.isActive = isActiveParam;
    }

    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total, groupedByRole] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assetLogs: true,
              sessions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ["role"],
        where: {
          tenantId: context.tenantId,
          role: { in: [...TENANT_MANAGED_ROLES] },
        },
        _count: { _all: true },
      }),
    ]);

    const roleSummary = groupedByRole.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = row._count._all;
      return acc;
    }, {});

    return NextResponse.json({
      data: users.map((user) => serializeUser(user)),
      total,
      page,
      perPage: limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      roleSummary,
      managedRoles: TENANT_MANAGED_ROLES,
    });
  } catch (error) {
    console.error("[USERS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveUserAdminContext(req);
    if ("response" in context) return context.response;

    const body = await req.json();
    const payload = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ja existe usuario com este e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const created = await prisma.user.create({
      data: {
        tenantId: context.tenantId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        isActive: payload.isActive,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assetLogs: true,
            sessions: true,
          },
        },
      },
    });

    return NextResponse.json({ data: serializeUser(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Payload invalido", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[USERS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
