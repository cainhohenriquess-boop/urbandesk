import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveUserAdminContext } from "@/lib/user-admin";

type ResetPasswordRouteContext = {
  params: Promise<{ id: string }>;
};

function generateTemporaryPassword(length = 12): string {
  const raw = randomBytes(length).toString("base64url");
  const base = raw.slice(0, Math.max(10, length));
  return `${base}A1!`;
}

async function resolveUserId(context: ResetPasswordRouteContext): Promise<string> {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

export async function POST(req: NextRequest, context: ResetPasswordRouteContext) {
  try {
    const adminContext = await resolveUserAdminContext(req);
    if ("response" in adminContext) return adminContext.response;

    const id = await resolveUserId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de usuario invalido." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: {
        id,
        tenantId: adminContext.tenantId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Usuario de plataforma nao pode ser gerenciado aqui." },
        { status: 403 }
      );
    }

    const temporaryPassword = generateTemporaryPassword(12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      data: {
        userId: target.id,
        temporaryPassword,
        note: "Senha temporaria gerada. Oriente o usuario a trocar no proximo acesso.",
      },
    });
  } catch (error) {
    console.error("[USERS_RESET_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
