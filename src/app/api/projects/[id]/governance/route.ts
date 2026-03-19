import { NextRequest, NextResponse } from "next/server";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { loadProjectGovernanceData } from "@/lib/project-governance-data";
import { resolveProjectGovernanceContext } from "@/lib/project-governance-api";

export const runtime = "nodejs";

type ProjectGovernanceRouteParams = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectGovernanceRouteParams) {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

export async function GET(req: NextRequest, context: ProjectGovernanceRouteParams) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:governance:get",
      limit: 120,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectGovernanceContext(req, projectId, "read");
    if ("response" in routeContext) return routeContext.response;

    const payload = await loadProjectGovernanceData({
      tenantId: routeContext.tenantId,
      projectId: routeContext.project.id,
      projectTechnicalAreas: routeContext.project.technicalAreas,
      compatibility: routeContext.compatibility,
    });

    return NextResponse.json({
      ...payload,
      compatibility: {
        governanceOpsSchemaReady: routeContext.compatibility.governanceOpsSchemaReady,
        notice: routeContext.compatibility.governanceOpsNotice,
      },
    });
  } catch (error) {
    console.error("[PROJECT_GOVERNANCE_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao carregar pendências e riscos do projeto." },
      { status: 500 }
    );
  }
}
