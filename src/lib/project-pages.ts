import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getAccessBlockReason } from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";
import {
  getProjectSchemaCompatibility,
  type ProjectSchemaCompatibility,
} from "@/lib/project-schema-compat";

const projectShellInclude = {
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  inspector: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  contracts: {
    select: {
      id: true,
      title: true,
      status: true,
      contractorName: true,
      contractedAmount: true,
      measuredAmount: true,
      paidAmount: true,
      endDate: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 2,
  },
  _count: {
    select: {
      assets: true,
      comments: true,
      contracts: true,
      documents: true,
      fundingSources: true,
      inspections: true,
      issues: true,
      measurements: true,
      milestones: true,
      phases: true,
      risks: true,
    },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectShellRecord = Prisma.ProjectGetPayload<{
  include: typeof projectShellInclude;
}>;

export type ProjectShellData = {
  tenantId: string | null;
  project: ProjectShellRecord | null;
  compatibility: ProjectSchemaCompatibility;
};

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

const getProjectShellDataCached = cache(async (projectId: string): Promise<ProjectShellData> => {
  const tenantId = await resolveProjectsTenantId();
  const compatibility = await getProjectSchemaCompatibility();

  if (!tenantId) {
    return {
      tenantId: null,
      project: null,
      compatibility,
    };
  }

  if (!compatibility.governanceSchemaReady) {
    return {
      tenantId,
      project: null,
      compatibility,
    };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    include: projectShellInclude,
  });

  return {
    tenantId,
    project,
    compatibility,
  };
});

export async function getProjectShellData(projectId: string) {
  return getProjectShellDataCached(projectId);
}
