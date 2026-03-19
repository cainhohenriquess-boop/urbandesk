import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCampoRequestContext } from "@/lib/campo-api";
import { resolveCampoAssetTechnicalContext } from "@/lib/campo-project-links";
import { enforceRequestRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:campo:context:get",
      limit: 90,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const access = await resolveCampoRequestContext(req);
    if ("response" in access) return access.response;

    const { tenantId } = access;
    const projectId = req.nextUrl.searchParams.get("projectId")?.trim() || null;

    const projects = await prisma.project.findMany({
      where: {
        tenantId,
        status: { not: "CANCELADO" },
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        code: true,
        technicalAreas: true,
        neighborhood: true,
        district: true,
        region: true,
        phases: {
          orderBy: [{ sequence: "asc" }],
          select: {
            id: true,
            name: true,
            sequence: true,
            technicalArea: true,
            status: true,
          },
        },
      },
    });

    let assets: Array<{
      id: string;
      name: string;
      type: string;
      technicalArea: string | null;
      technicalObjectType: string | null;
    }> = [];

    if (projectId) {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
      }

      const projectAssets = await prisma.asset.findMany({
        where: { tenantId, projectId },
        orderBy: [{ updatedAt: "desc" }],
        take: 300,
        select: {
          id: true,
          name: true,
          type: true,
          attributes: true,
        },
      });

      assets = projectAssets.map((asset) => {
        const technicalContext = resolveCampoAssetTechnicalContext(asset);
        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          technicalArea: technicalContext.technicalArea,
          technicalObjectType: technicalContext.technicalObjectType,
        };
      });
    }

    return NextResponse.json({
      data: {
        projects,
        assets,
      },
    });
  } catch (error) {
    console.error("[CAMPO_CONTEXT_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
