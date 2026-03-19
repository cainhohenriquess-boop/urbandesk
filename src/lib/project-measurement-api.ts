import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { z } from "zod";
import type { ProjectTechnicalArea } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";
import { getProjectSchemaCompatibility, type ProjectSchemaCompatibility } from "@/lib/project-schema-compat";

const ALLOWED_ROLES = new Set(["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"]);
const tenantIdSchema = z.string().cuid();
const projectIdSchema = z.string().cuid();

export type ProjectMeasurementRouteProject = {
  id: string;
  code: string | null;
  name: string;
  technicalAreas: ProjectTechnicalArea[];
  contractedBudget: { toString(): string } | null;
  estimatedBudget: { toString(): string } | null;
  budget: { toString(): string } | null;
};

export type ProjectMeasurementRouteContext = {
  tenantId: string;
  role: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  project: ProjectMeasurementRouteProject;
  compatibility: ProjectSchemaCompatibility;
};

export async function resolveProjectMeasurementContext(
  req: NextRequest,
  projectIdRaw: string
): Promise<ProjectMeasurementRouteContext | { response: NextResponse }> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return { response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    return {
      response: NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      ),
    };
  }

  const role = session.user.role ?? "";
  if (!ALLOWED_ROLES.has(role)) {
    return { response: NextResponse.json({ error: "Não autorizado" }, { status: 403 }) };
  }

  const parsedProjectId = projectIdSchema.safeParse(projectIdRaw);
  if (!parsedProjectId.success) {
    return {
      response: NextResponse.json({ error: "ID de projeto inválido." }, { status: 400 }),
    };
  }

  const cookieStore = await cookies();
  let tenantId = session.user.tenantId ?? null;
  if (role === "SUPERADMIN") {
    const impersonatedTenantId = cookieStore.get("impersonate_tenant")?.value ?? null;
    if (impersonatedTenantId) {
      const parsedTenantId = tenantIdSchema.safeParse(impersonatedTenantId);
      if (!parsedTenantId.success) {
        return {
          response: NextResponse.json({ error: "Tenant inválido no cookie." }, { status: 400 }),
        };
      }
      tenantId = parsedTenantId.data;
    }
  }

  if (!tenantId || !tenantIdSchema.safeParse(tenantId).success) {
    return {
      response: NextResponse.json(
        { error: "Tenant não identificado para operação." },
        { status: 400 }
      ),
    };
  }

  const compatibility = await getProjectSchemaCompatibility();
  if (!compatibility.measurementSchemaReady) {
    return {
      response: NextResponse.json(
        {
          error:
            compatibility.measurementNotice ??
            "As medições do projeto ainda dependem de migration complementar.",
          code: "project_measurement_schema_pending",
        },
        { status: 503 }
      ),
    };
  }

  const project = await prisma.project.findFirst({
    where: { id: parsedProjectId.data, tenantId },
    select: {
      id: true,
      code: true,
      name: true,
      technicalAreas: true,
      contractedBudget: true,
      estimatedBudget: true,
      budget: true,
    },
  });

  if (!project) {
    return { response: NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 }) };
  }

  return {
    tenantId,
    role,
    userId: session.user.id ?? null,
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
    project,
    compatibility,
  };
}
