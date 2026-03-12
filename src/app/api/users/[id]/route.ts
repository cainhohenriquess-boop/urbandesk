import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  TENANT_MANAGED_ROLES,
  resolveUserAdminContext,
} from "@/lib/user-admin";

type UserRouteContext = {
  params: Promise<{ id: string }>;
};

const updateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    email: z.string().trim().toLowerCase().email().max(180).optional(),
    role: z.enum(TENANT_MANAGED_ROLES).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

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

async function resolveUserId(context: UserRouteContext): Promise<string> {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

async function hasAnotherActiveSecretary(
  tenantId: string,
  excludingUserId: string
): Promise<boolean> {
  const count = await prisma.user.count({
    where: {
      tenantId,
      role: "SECRETARIO",
      isActive: true,
      id: { not: excludingUserId },
    },
  });
  return count > 0;
}

export async function GET(req: NextRequest, context: UserRouteContext) {
  try {
    const adminContext = await resolveUserAdminContext(req);
    if ("response" in adminContext) return adminContext.response;

    const id = await resolveUserId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de usuario invalido." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        tenantId: adminContext.tenantId,
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

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    if (user.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Usuario de plataforma nao pode ser gerenciado aqui." },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: serializeUser(user) });
  } catch (error) {
    console.error("[USERS_ID_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: UserRouteContext) {
  try {
    const adminContext = await resolveUserAdminContext(req);
    if ("response" in adminContext) return adminContext.response;

    const id = await resolveUserId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de usuario invalido." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        id,
        tenantId: adminContext.tenantId,
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

    if (!existing) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    if (existing.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Usuario de plataforma nao pode ser alterado aqui." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const payload = updateUserSchema.parse(body);

    const isSelf = existing.id === adminContext.userId;
    if (
      adminContext.role === "SECRETARIO" &&
      isSelf &&
      (payload.role !== undefined || payload.isActive === false)
    ) {
      return NextResponse.json(
        { error: "Nao e permitido alterar seu proprio papel ou desativar sua conta." },
        { status: 403 }
      );
    }

    const willDemoteOrDisableSecretary =
      existing.role === "SECRETARIO" &&
      ((payload.role !== undefined && payload.role !== "SECRETARIO") ||
        payload.isActive === false);

    if (willDemoteOrDisableSecretary) {
      const hasBackup = await hasAnotherActiveSecretary(adminContext.tenantId, existing.id);
      if (!hasBackup) {
        return NextResponse.json(
          { error: "O tenant precisa manter ao menos um secretario ativo." },
          { status: 409 }
        );
      }
    }

    if (payload.email && payload.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: payload.email },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== existing.id) {
        return NextResponse.json(
          { error: "Ja existe usuario com este e-mail." },
          { status: 409 }
        );
      }
    }

    const passwordHash =
      payload.password !== undefined
        ? await bcrypt.hash(payload.password, 10)
        : undefined;

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.role !== undefined ? { role: payload.role } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(passwordHash ? { passwordHash } : {}),
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

    return NextResponse.json({ data: serializeUser(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Payload invalido", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[USERS_ID_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: UserRouteContext) {
  try {
    const adminContext = await resolveUserAdminContext(req);
    if ("response" in adminContext) return adminContext.response;

    const id = await resolveUserId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de usuario invalido." }, { status: 400 });
    }

    const mode = req.nextUrl.searchParams.get("mode");

    const existing = await prisma.user.findFirst({
      where: {
        id,
        tenantId: adminContext.tenantId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        _count: {
          select: {
            assetLogs: true,
            sessions: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    if (existing.id === adminContext.userId) {
      return NextResponse.json(
        { error: "Nao e permitido remover seu proprio usuario." },
        { status: 400 }
      );
    }

    if (existing.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Usuario de plataforma nao pode ser removido aqui." },
        { status: 403 }
      );
    }

    if (existing.role === "SECRETARIO" && existing.isActive) {
      const hasBackup = await hasAnotherActiveSecretary(adminContext.tenantId, existing.id);
      if (!hasBackup) {
        return NextResponse.json(
          { error: "O tenant precisa manter ao menos um secretario ativo." },
          { status: 409 }
        );
      }
    }

    const hardEligible =
      existing._count.assetLogs === 0 && existing._count.sessions === 0;
    const hardRequested = mode === "hard";

    if (hardRequested && hardEligible) {
      await prisma.user.delete({ where: { id: existing.id } });
      return NextResponse.json({ mode: "hard", success: true });
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { isActive: false },
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

    return NextResponse.json({
      mode: "soft",
      reason: hardRequested && !hardEligible
        ? "Usuario possui historico vinculado e nao pode ser removido fisicamente."
        : "Soft delete aplicado.",
      data: serializeUser(updated),
    });
  } catch (error) {
    console.error("[USERS_ID_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
