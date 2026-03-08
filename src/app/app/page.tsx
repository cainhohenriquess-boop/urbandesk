import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AppTrafficController() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const role = session.user?.role;

  // O "Guarda de Trânsito" que manda cada um para sua casa
  if (role === "SUPERADMIN") redirect("/superadmin");
  if (role === "ENGENHEIRO") redirect("/app/projetos");
  if (role === "CAMPO")      redirect("/app/campo");

  // Padrão para Secretaria
  redirect("/app/secretaria");
}