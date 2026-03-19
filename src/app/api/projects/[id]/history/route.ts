import { NextRequest, NextResponse } from "next/server";
import { loadProjectHistoryData } from "@/lib/project-governance-data";
import { resolveProjectGovernanceContext } from "@/lib/project-governance-api";
import { enforceRequestRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ProjectHistoryRouteParams = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectHistoryRouteParams) {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

export async function GET(req: NextRequest, context: ProjectHistoryRouteParams) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:history:get",
      limit: 120,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectGovernanceContext(req, projectId, "read");
    if ("response" in routeContext) return routeContext.response;

    const payload = await loadProjectHistoryData({
      tenantId: routeContext.tenantId,
      projectId: routeContext.project.id,
      projectTechnicalAreas: routeContext.project.technicalAreas,
      compatibility: routeContext.compatibility,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[PROJECT_HISTORY_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao carregar o histórico do projeto." },
      { status: 500 }
    );
  }
}
