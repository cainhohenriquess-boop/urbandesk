import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { getStorageDriverName, getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MODULE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,39}$/;

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
};

function resolveUploadModule(formData: FormData): string | null {
  const rawModule = formData.get("module");
  const moduleName = typeof rawModule === "string" && rawModule.trim().length > 0
    ? rawModule.trim().toLowerCase()
    : "campo";

  if (!MODULE_PATTERN.test(moduleName)) {
    return null;
  }

  return moduleName;
}

function inferExtension(file: File): string | null {
  const allowedByMime = ALLOWED_MIME_TYPES[file.type];
  if (!allowedByMime) return null;

  const rawExt = file.name.split(".").pop()?.toLowerCase();
  if (!rawExt) return allowedByMime[0];

  if (allowedByMime.includes(rawExt)) {
    return rawExt === "jpeg" ? "jpg" : rawExt;
  }

  return allowedByMime[0];
}

function resolveTenantId(
  role: string | undefined,
  sessionTenantId: string | undefined,
  impersonatedTenantId: string | undefined
): string | null {
  if (role === "SUPERADMIN") {
    return impersonatedTenantId ?? sessionTenantId ?? null;
  }
  return sessionTenantId ?? null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const tenantId = resolveTenantId(
      session.user.role,
      session.user.tenantId,
      cookieStore.get("impersonate_tenant")?.value
    );

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant nao identificado para upload." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const moduleName = resolveUploadModule(formData);
    if (!moduleName) {
      return NextResponse.json(
        { error: "Modulo de upload invalido." },
        { status: 400 }
      );
    }

    const rawFiles = formData.getAll("files");
    const files = rawFiles.filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    if (rawFiles.length !== files.length) {
      return NextResponse.json(
        { error: "Payload de arquivos invalido." },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Limite de ${MAX_FILES} arquivos por envio.` },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const uploadedFiles = [];

    for (const file of files) {
      if (!(file.type in ALLOWED_MIME_TYPES)) {
        return NextResponse.json(
          { error: `Tipo de arquivo invalido: ${file.type || "desconhecido"}.` },
          { status: 400 }
        );
      }

      if (file.size <= 0) {
        return NextResponse.json(
          { error: "Arquivo vazio nao permitido." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
          { status: 400 }
        );
      }

      const extension = inferExtension(file);
      if (!extension) {
        return NextResponse.json(
          { error: "Nao foi possivel validar a extensao do arquivo." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const stored = await storage.upload({
        buffer,
        contentLength: file.size,
        contentType: file.type,
        extension,
        moduleName,
        originalName: file.name,
        tenantId,
      });

      uploadedFiles.push(stored);
    }

    return NextResponse.json({
      success: true,
      provider: getStorageDriverName(),
      tenantId,
      module: moduleName,
      files: uploadedFiles,
      urls: uploadedFiles.map((file) => file.url),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}
