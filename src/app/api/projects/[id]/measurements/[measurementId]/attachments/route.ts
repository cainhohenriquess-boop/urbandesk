import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ProjectDocumentType } from "@prisma/client";
import {
  AUDIT_ACTIONS,
  extractRequestContext,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { resolveProjectMeasurementContext } from "@/lib/project-measurement-api";
import { getStorageDriverName, getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx", "csv"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

type ProjectMeasurementAttachmentRouteContext = {
  params: Promise<{ id: string; measurementId: string }>;
};

async function resolveRouteParams(context: ProjectMeasurementAttachmentRouteContext) {
  const params = await context.params;
  return {
    projectId: typeof params.id === "string" ? params.id : "",
    measurementId: typeof params.measurementId === "string" ? params.measurementId : "",
  };
}

function resolveExtension(file: File) {
  const ext = path.extname(file.name).replace(/^\./, "").toLowerCase();
  return ext || null;
}

function buildDocumentTitle(fileName: string) {
  return path.basename(fileName, path.extname(fileName)).trim() || "Anexo de medição";
}

export async function POST(req: NextRequest, context: ProjectMeasurementAttachmentRouteContext) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:measurements:attachments:post",
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { projectId, measurementId } = await resolveRouteParams(context);
    const routeContext = await resolveProjectMeasurementContext(req, projectId);
    if ("response" in routeContext) return routeContext.response;

    const measurement = await prisma.projectMeasurement.findFirst({
      where: {
        id: measurementId,
        tenantId: routeContext.tenantId,
        projectId: routeContext.project.id,
      },
      select: {
        id: true,
        measurementNumber: true,
        phaseId: true,
        contractId: true,
        technicalArea: true,
      },
    });

    if (!measurement) {
      return NextResponse.json({ error: "Medição não encontrada." }, { status: 404 });
    }

    const formData = await req.formData();
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

    const storage = getStorageProvider();
    const createdDocuments = [] as Array<{
      id: string;
      title: string;
      fileName: string;
      fileUrl: string | null;
      mimeType: string | null;
      fileSize: number | null;
      documentDate: string | null;
    }>;

    for (const file of files) {
      const extension = resolveExtension(file);
      if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
        return NextResponse.json(
          { error: `Extensão de arquivo não permitida: ${file.name}.` },
          { status: 400 }
        );
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
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
        moduleName: "project-measurements",
        originalName: file.name,
        tenantId: routeContext.tenantId,
      });

      const documentDate = new Date();
      const created = await prisma.projectDocument.create({
        data: {
          title: buildDocumentTitle(file.name),
          documentType: ProjectDocumentType.MEDICAO,
          fileName: file.name,
          storageKey: stored.key,
          fileUrl: stored.url,
          mimeType: stored.contentType,
          fileSize: stored.size,
          documentDate,
          isPublic: false,
          metadata: {
            secureUrl: stored.secureUrl,
            secureUrlExpiresAt: stored.secureUrlExpiresAt,
            provider: stored.provider,
            module: stored.moduleName,
          },
          tenantId: routeContext.tenantId,
          projectId: routeContext.project.id,
          ...(routeContext.compatibility.documentSchemaReady
            ? { technicalArea: measurement.technicalArea }
            : {}),
          phaseId: measurement.phaseId,
          contractId: measurement.contractId,
          measurementId: measurement.id,
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
        },
      });

      createdDocuments.push({
        ...created,
        documentDate: created.documentDate ? created.documentDate.toISOString() : null,
      });
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_MEASUREMENT_ATTACHMENT_UPLOAD,
      entityType: "project_measurement",
      entityId: measurement.id,
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
        measurementId: measurement.id,
        measurementNumber: measurement.measurementNumber,
        files: createdDocuments.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          mimeType: item.mimeType,
        })),
        provider: getStorageDriverName(),
      },
    });

    return NextResponse.json({
      message: "Anexos enviados com sucesso.",
      attachments: createdDocuments,
    });
  } catch (error) {
    console.error("[PROJECT_MEASUREMENT_ATTACHMENTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro ao enviar anexos da medição." }, { status: 500 });
  }
}
