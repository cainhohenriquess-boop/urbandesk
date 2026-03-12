import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const reason = getAccessBlockReason(session.user);
  if (reason) {
    return NextResponse.json({ error: getAccessBlockMessage(reason), code: reason }, { status: 403 });
  }

  // Regra de segurança nº 1: Apenas o SUPERADMIN pode usar isto
  if (session.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
  }

  // Se não passar ID da prefeitura, assumimos que o SuperAdmin quer SAIR do modo fantasma
  if (!tenantId) {
    cookieStore.delete("impersonate_tenant");
    return NextResponse.redirect(new URL("/superadmin", request.url));
  }

  const targetTenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!targetTenant) {
    return NextResponse.redirect(new URL("/superadmin?error=tenant_not_found", request.url));
  }

  // MÁGICA: Injeta o "impersonation_token" num cookie HTTP Only super seguro
  cookieStore.set("impersonate_tenant", tenantId, {
    path: "/", 
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });
  
  // Redireciona o SuperAdmin para a tela da Secretaria daquele cliente
  const dashboardUrl = new URL("/app/secretaria", request.url);
  
  return NextResponse.redirect(dashboardUrl);
}
