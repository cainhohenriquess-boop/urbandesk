import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccessBlockReason, getRoleHome } from "@/lib/auth-shared";

export default async function AppTrafficController() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    if (reason === "tenant_inactive" || reason === "trial_expired") {
      redirect(`/app/billing?reason=${reason}`);
    }
    redirect(`/login?error=${reason}`);
  }

  redirect(getRoleHome(session.user?.role));
}
