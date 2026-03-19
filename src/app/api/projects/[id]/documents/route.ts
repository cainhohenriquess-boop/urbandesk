import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  extractRequestContext,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { resolveProjectDocumentContext } from "@/lib/project-document-api";
import {
  PROJECT_DOCUMENT_ALLOWED_EXTENSIONS,
  PROJECT_DOCUMENT_ALLOWED_MIME_TYPES,
  buildProjectDocumentIndicators,
  buildProjectDocumentTitle,
  projectDocumentUploadInputSchema,
  serializeProjectDocuments,
} from "@/lib/project-documents";
import { getStorageDriverName, getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type ProjectDocumentsRouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: ProjectDocumentsRouteContext) {
  const params = await context.params;
  return typeof params.id === "string" ? params.id : "";
}

function resolveExtension(file: File) {
  const ext = path.extname(file.name).replace(/^\./, "").toLowerCase();
  return ext || null;
}

function buildProjectDocumentSelect(input: {
  documentSchemaReady: boolean;
  measurementSchemaReady: boolean;
}) {
  return {
    id: true,
    title: true,
    description: true,
    documentType: true,
    fileName: true,
    fileUrl: true,
    mimeType: true,
    fileSize: true,
    documentDate: true,
    isPublic: true,
    createdAt: true,
    updatedAt: true,
    ...(input.documentSchemaReady ? { technicalArea: true } : {}),
    uploadedBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    phase: {
      select: {
        id: true,
        name: true,
        sequence: true,
      },
    },
    contract: {
      select: {
        id: true,
        title: true,
        contractNumber: true,
      },
    },
    ...(input.measurementSchemaReady
      ? {
          measurement: {
            select: {
              id: true,
              measurementNumber: true,
            },
          },
        }
      : {}),
  };
}

async function loadProjectDocuments(input: {
  tenantId: string;
  projectId: string;
  documentSchemaReady: boolean;
  measurementSchemaReady: boolean;
}) {
  return prisma.projectDocument.findMany({
    where: { tenantId: input.tenantId, projectId: input.projectId },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    select: buildProjectDocumentSelect({
      documentSchemaReady: input.documentSchemaReady,
      measurementSchemaReady: input.measurementSchemaReady,
    }),
  });
}

async function buildDocumentsResponse(input: {
  tenantId: string;
  projectId: string;
  technicalAreas: string[];
  documentSchemaReady: boolean;
  measurementSchemaReady: boolean;
  documentNotice: string | null;
}) {
  const documents = serializeProjectDocuments(
    await loadProjectDocuments({
      tenantId: input.tenantId,
      projectId: input.projectId,
      documentSchemaReady: input.documentSchemaReady,
      measurementSchemaReady: input.measurementSchemaReady,
    })
  );

  return {
    data: documents,
    indicators: buildProjectDocumentIndicators(documents),
    options: {
      technicalAreas: input.technicalAreas,
    },
    compatibility: {
      documentSchemaReady: input.documentSchemaReady,
      measurementSchemaReady: input.measurementSchemaReady,
      notice: input.documentNotice,
    },
  };
}

export async function GET(req: NextRequest, context: ProjectDocumentsRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:documents:get",
      limit: 120,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectDocumentContext(req, projectId, "read");
    if ("response" in routeContext) return routeContext.response;

    return NextResponse.json(
      await buildDocumentsResponse({
        tenantId: routeContext.tenantId,
        projectId: routeContext.project.id,
        technicalAreas: routeContext.project.technicalAreas,
        documentSchemaReady: routeContext.compatibility.documentSchemaReady,
        measurementSchemaReady: routeContext.compatibility.measurementSchemaReady,
        documentNotice: routeContext.compatibility.documentNotice,
      })
    );
  } catch (error) {
    console.error("[PROJECT_DOCUMENTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro ao carregar documentos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: ProjectDocumentsRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:documents:post",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(context);
    const routeContext = await resolveProjectDocumentContext(req, projectId, "write");
    if ("response" in routeContext) return routeContext.response;

    const formData = await req.formData();
    const payload = projectDocumentUploadInputSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      documentType: formData.get("documentType"),
      documentDate: formData.get("documentDate"),
      technicalArea: formData.get("technicalArea"),
      phaseId: formData.get("phaseId"),
      contractId: formData.get("contractId"),
      measurementId: formData.get("measurementId"),
      isPublic: formData.get("isPublic"),
    });

    const rawFiles = formData.getAll("files");
    const files = rawFiles.filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Limite de ${MAX_FILES} anexos por envio.` },
        { status: 400 }
      );
    }

    if (
      payload.technicalArea &&
      routeContext.project.technicalAreas.length > 0 &&
      !routeContext.project.technicalAreas.includes(payload.technicalArea)
    ) {
      return NextResponse.json(
        { error: "A área técnica informada não está vinculada a este projeto." },
        { status: 400 }
      );
    }

    const [phase, contract, measurement] = await Promise.all([
      payload.phaseId
        ? prisma.projectPhase.findFirst({
            where: {
              id: payload.phaseId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              name: true,
              sequence: true,
              technicalArea: true,
            },
          })
        : Promise.resolve(null),
      payload.contractId
        ? prisma.projectContract.findFirst({
            where: {
              id: payload.contractId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              title: true,
              contractNumber: true,
            },
          })
        : Promise.resolve(null),
      payload.measurementId && routeContext.compatibility.measurementSchemaReady
        ? prisma.projectMeasurement.findFirst({
            where: {
              id: payload.measurementId,
              tenantId: routeContext.tenantId,
              projectId: routeContext.project.id,
            },
            select: {
              id: true,
              measurementNumber: true,
              technicalArea: true,
              phaseId: true,
              contractId: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (payload.phaseId && !phase) {
      return NextResponse.json({ error: "Etapa não encontrada no projeto." }, { status: 404 });
    }

    if (payload.contractId && !contract) {
      return NextResponse.json({ error: "Contrato não encontrado no projeto." }, { status: 404 });
    }

    if (payload.measurementId && !routeContext.compatibility.measurementSchemaReady) {
      return NextResponse.json(
        {
          error:
            routeContext.compatibility.measurementNotice ??
            "As medições ainda não estão disponíveis neste ambiente.",
        },
        { status: 503 }
      );
    }

    if (payload.measurementId && !measurement) {
      return NextResponse.json({ error: "Medição não encontrada no projeto." }, { status: 404 });
    }

    const technicalArea =
      payload.technicalArea ?? measurement?.technicalArea ?? phase?.technicalArea ?? null;

    if (
      phase?.technicalArea &&
      technicalArea &&
      phase.technicalArea !== technicalArea
    ) {
      return NextResponse.json(
        { error: "A etapa selecionada pertence a uma área técnica diferente da informada." },
        { status: 400 }
      );
    }

    if (
      measurement?.technicalArea &&
      technicalArea &&
      measurement.technicalArea !== technicalArea
    ) {
      return NextResponse.json(
        { error: "A medição selecionada pertence a uma área técnica diferente da informada." },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const createdDocuments = [] as Array<{
      id: string;
      title: string;
      fileName: string;
      fileUrl: string | null;
      mimeType: string | null;
      fileSize: number | null;
      documentDate: string | null;
      technicalArea: string | null;
    }>;

    for (const file of files) {
      const extension = resolveExtension(file);
      if (!extension || !PROJECT_DOCUMENT_ALLOWED_EXTENSIONS.has(extension)) {
        return NextResponse.json(
          { error: `Extensão de arquivo não permitida: ${file.name}.` },
          { status: 400 }
        );
      }

      if (file.type && !PROJECT_DOCUMENT_ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo não permitido: ${file.type}.` },
          { status: 400 }
        );
      }

      if (file.size <= 0) {
        return NextResponse.json({ error: "Arquivo vazio não é permitido." }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
          { status: 400 }
        );
      }

      const stored = await storage.upload({
        buffer: Buffer.from(await file.arrayBuffer()),
        contentLength: file.size,
        contentType: file.type || "application/octet-stream",
        extension,
        moduleName: "project-documents",
        originalName: file.name,
        tenantId: routeContext.tenantId,
      });

      const documentDate = payload.documentDate ?? new Date();
      const created = await prisma.projectDocument.create({
        data: {
          title: buildProjectDocumentTitle(
            file.name,
            files.length === 1 ? payload.title : null
          ),
          description: payload.description,
          documentType: payload.documentType,
          fileName: file.name,
          storageKey: stored.key,
          fileUrl: stored.url,
          mimeType: stored.contentType,
          fileSize: stored.size,
          documentDate,
          isPublic: payload.isPublic,
          metadata: {
            secureUrl: stored.secureUrl,
            secureUrlExpiresAt: stored.secureUrlExpiresAt,
            provider: stored.provider,
            module: stored.moduleName,
          },
          tenantId: routeContext.tenantId,
          projectId: routeContext.project.id,
          technicalArea: technicalArea ?? undefined,
          phaseId: phase?.id ?? measurement?.phaseId ?? null,
          contractId: contract?.id ?? measurement?.contractId ?? null,
          measurementId: measurement?.id ?? null,
          uploadedById: routeContext.userId,
        },
        select: {
          id: true,
          title: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          fileSize: true,
          documentDate: true,
          technicalArea: true,
        },
      });

      createdDocuments.push({
        ...created,
        documentDate: created.documentDate ? created.documentDate.toISOString() : null,
        technicalArea: created.technicalArea ?? null,
      });
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_DOCUMENT_UPLOAD,
      entityType: "project_document",
      entityId: createdDocuments[0]?.id ?? null,
      actor: {
        userId: routeContext.userId,
        userName: routeContext.userName,
        userEmail: routeContext.userEmail,
        userRole: routeContext.role,
        tenantId: routeContext.tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        projectId: routeContext.project.id,
        documentType: payload.documentType,
        technicalArea,
        phaseId: phase?.id ?? null,
        contractId: contract?.id ?? null,
        measurementId: measurement?.id ?? null,
        files: createdDocuments,
        provider: getStorageDriverName(),
      },
    });

    const response = await buildDocumentsResponse({
      tenantId: routeContext.tenantId,
      projectId: routeContext.project.id,
      technicalAreas: routeContext.project.technicalAreas,
      documentSchemaReady: routeContext.compatibility.documentSchemaReady,
      measurementSchemaReady: routeContext.compatibility.measurementSchemaReady,
      documentNotice: routeContext.compatibility.documentNotice,
    });

    return NextResponse.json({
      message: "Documento(s) enviado(s) com sucesso.",
      createdDocuments,
      ...response,
    });
  } catch (error) {
    console.error("[PROJECT_DOCUMENTS_POST_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos para o documento." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Erro ao enviar documentos do projeto." }, { status: 500 });
  }
}
