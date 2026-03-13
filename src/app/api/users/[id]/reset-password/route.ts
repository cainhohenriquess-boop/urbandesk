import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveUserAdminContext } from "@/lib/user-admin";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

type ResetPasswordRouteContext = {
  params: Promise<{ id: string }>;
};

const userIdSchema = z.string().cuid();

function generateTemporaryPassword(length = 12): string {
  const raw = randomBytes(length).toString("base64url");
  const base = raw.slice(0, Math.max(10, length));
  return `${base}A1!`;
}

async function resolveUserId(context: ResetPasswordRouteContext): Promise<string> {
  const params = await context.params;
  if (typeof params.id !== "string") return "";
  const parsed = userIdSchema.safeParse(params.id);
  return parsed.success ? parsed.data : "";
}

export async function POST(req: NextRequest, context: ResetPasswordRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:users:id:reset-password:post",
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const adminContext = await resolveUserAdminContext(req);
    if ("response" in adminContext) return adminContext.response;

    const id = await resolveUserId(context);
    if (!id) {
      return NextResponse.json({ error: "ID de usuário inválido." }, { status: 400 });
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
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Usuário de plataforma não pode ser gerenciado aqui." },
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
        note: "Senha temporária gerada. Oriente o usuário a trocar no próximo acesso.",
      },
    });
  } catch (error) {
    console.error("[USERS_RESET_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
