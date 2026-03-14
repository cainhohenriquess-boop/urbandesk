import { randomUUID } from "crypto";
import type { StoredUploadFile, StorageUploadInput } from "@/lib/storage";

type StorageDriverName = "local" | "s3";

type StorageProviderLike = {
  upload(input: StorageUploadInput): Promise<StoredUploadFile>;
};

export type InfrastructureArchiveStorageResult = {
  storedArchive: StoredUploadFile;
  archivePersisted: boolean;
  warning: string | null;
};

const RECOVERABLE_LOCAL_STORAGE_CODES = new Set(["ENOENT", "EROFS", "EACCES", "EPERM"]);

function normalizeModuleName(moduleName: string) {
  return moduleName.trim().toLowerCase();
}

function buildEphemeralArchiveKey(input: StorageUploadInput) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const fileName = `${Date.now()}-${randomUUID()}.${input.extension}`;
  return `uploads/tenants/${input.tenantId}/${normalizeModuleName(input.moduleName)}/${year}/${month}/${day}/${fileName}`;
}

function createEphemeralArchiveReference(input: StorageUploadInput): StoredUploadFile {
  return {
    provider: "local",
    key: buildEphemeralArchiveKey(input),
    url: "",
    secureUrl: "",
    secureUrlExpiresAt: null,
    contentType: input.contentType,
    size: input.contentLength,
    originalName: input.originalName,
    moduleName: normalizeModuleName(input.moduleName),
    tenantId: input.tenantId,
  };
}

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.AWS_REGION
  );
}

function isRecoverableLocalStorageError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code && RECOVERABLE_LOCAL_STORAGE_CODES.has(nodeError.code)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("/var/task/public/uploads") ||
    message.includes("read-only file system") ||
    message.includes("no such file or directory, mkdir") ||
    message.includes("operation not permitted")
  );
}

function getArchiveStorageWarning() {
  return "A camada foi processada e publicada, mas o ZIP original não foi arquivado neste ambiente porque o storage persistente não está configurado. Para manter o arquivo-fonte, configure STORAGE_DRIVER=s3 com um bucket compatível.";
}

export async function storeInfrastructureArchive(input: {
  driverName: StorageDriverName;
  provider: StorageProviderLike;
  upload: StorageUploadInput;
}): Promise<InfrastructureArchiveStorageResult> {
  if (input.driverName === "local" && isServerlessRuntime()) {
    return {
      storedArchive: createEphemeralArchiveReference(input.upload),
      archivePersisted: false,
      warning: getArchiveStorageWarning(),
    };
  }

  try {
    const storedArchive = await input.provider.upload(input.upload);
    return {
      storedArchive,
      archivePersisted: true,
      warning: null,
    };
  } catch (error) {
    if (input.driverName === "local" && isRecoverableLocalStorageError(error)) {
      return {
        storedArchive: createEphemeralArchiveReference(input.upload),
        archivePersisted: false,
        warning: getArchiveStorageWarning(),
      };
    }

    throw error;
  }
}
