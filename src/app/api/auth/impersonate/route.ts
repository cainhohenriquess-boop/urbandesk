import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  // Regra de segurança nº 1: Apenas o SUPERADMIN pode usar isto
  if (!session || session.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
  }

  // Se não passar ID da prefeitura, assumimos que o SuperAdmin quer SAIR do modo fantasma
  if (!tenantId) {
    cookies().delete("impersonate_tenant");
    return NextResponse.redirect(new URL("/superadmin", request.url));
  }

  // MÁGICA: Injeta o "impersonation_token" num cookie HTTP Only super seguro
  cookies().set("impersonate_tenant", tenantId, { 
    path: "/", 
    httpOnly: true,
    sameSite: "lax"
  });
  
  // Redireciona o SuperAdmin para a tela da Secretaria daquele cliente
  const dashboardUrl = new URL("/app/secretaria", request.url);
  
  return NextResponse.redirect(dashboardUrl);
}