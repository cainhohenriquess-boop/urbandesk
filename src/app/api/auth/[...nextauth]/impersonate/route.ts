import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  // Regra de segurança nº 1: Apenas o SUPERADMIN pode usar isto
  if (!session || session.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso Negado" }, { status: 403 });
  }

  if (!tenantId) {
    return NextResponse.json({ error: "ID da Prefeitura não fornecido" }, { status: 400 });
  }

  // Em um sistema real em produção, aqui injetaríamos um "impersonation_token" num cookie
  // Por enquanto, vamos redirecionar o SuperAdmin para a tela da Secretaria 
  // para ele ver como a plataforma fica (como se fosse um cliente).
  
  const dashboardUrl = new URL("/app/secretaria", request.url);
  
  // Enviamos um aviso na URL para ele saber que está no modo "Fantasma"
  dashboardUrl.searchParams.set("impersonating", tenantId);

  return NextResponse.redirect(dashboardUrl);
}