import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccessBlockReason } from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";

export async function resolveProjectsTenantId() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    if (reason === "tenant_inactive" || reason === "trial_expired") {
      redirect(`/app/billing?reason=${reason}`);
    }
    redirect(`/login?error=${reason}`);
  }

  let tenantId = session.user.tenantId ?? null;

  if (session.user.role === "SUPERADMIN") {
    const cookieStore = await cookies();
    tenantId = cookieStore.get("impersonate_tenant")?.value ?? tenantId;
  }

  return tenantId;
}

export async function getProjectShellData(projectId: string) {
  const tenantId = await resolveProjectsTenantId();

  if (!tenantId) {
    return { tenantId: null, project: null };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    include: {
      _count: { select: { assets: true } },
    },
  });

  return { tenantId, project };
}
