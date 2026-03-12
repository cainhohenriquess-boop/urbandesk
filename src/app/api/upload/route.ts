import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function inferExtension(file: File): string {
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  if (byMime[file.type]) return byMime[file.type];

  const rawExt = file.name.split(".").pop()?.toLowerCase();
  if (rawExt && /^[a-z0-9]+$/.test(rawExt)) return rawExt;
  return "bin";
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const reason = getAccessBlockReason(session.user);
    if (reason) {
      return NextResponse.json({ error: getAccessBlockMessage(reason), code: reason }, { status: 403 });
    }

    const tenantId = session.user.role === "SUPERADMIN"
      ? (cookieStore.get("impersonate_tenant")?.value ?? session.user.tenantId)
      : session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant não identificado para upload." }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Limite de ${MAX_FILES} arquivos por envio.` }, { status: 400 });
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");

    const uploadDir = path.join(process.cwd(), "public", "uploads", tenantId, year, month);
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Tipo de arquivo inválido: ${file.type || "desconhecido"}.` }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `Arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }, { status: 400 });
      }

      const extension = inferExtension(file);
      const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
      const absolutePath = path.join(uploadDir, fileName);
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      await fs.writeFile(absolutePath, fileBuffer);
      urls.push(`/uploads/${tenantId}/${year}/${month}/${fileName}`);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}
