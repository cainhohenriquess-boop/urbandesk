import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;

type StorageDriver = "local" | "s3";

export interface StorageUploadInput {
  buffer: Buffer;
  contentLength: number;
  contentType: string;
  extension: string;
  moduleName: string;
  originalName: string;
  tenantId: string;
}

export interface StoredUploadFile {
  provider: StorageDriver;
  key: string;
  url: string;
  secureUrl: string;
  secureUrlExpiresAt: string | null;
  contentType: string;
  size: number;
  originalName: string;
  moduleName: string;
  tenantId: string;
}

interface StorageProvider {
  upload(input: StorageUploadInput): Promise<StoredUploadFile>;
}

interface S3StorageConfig {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
  region: string;
  secretAccessKey: string;
  signedUrlTtlSeconds: number;
}

class LocalStorageProvider implements StorageProvider {
  public readonly provider: StorageDriver = "local";

  async upload(input: StorageUploadInput): Promise<StoredUploadFile> {
    const objectKey = buildObjectKey(input);
    const absolutePath = path.join(process.cwd(), "public", objectKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    const localUrl = `/${objectKey}`;

    return {
      provider: this.provider,
      key: objectKey,
      url: localUrl,
      secureUrl: localUrl,
      secureUrlExpiresAt: null,
      contentType: input.contentType,
      size: input.contentLength,
      originalName: input.originalName,
      moduleName: normalizeModuleName(input.moduleName),
      tenantId: input.tenantId,
    };
  }
}

class S3StorageProvider implements StorageProvider {
  public readonly provider: StorageDriver = "s3";
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    const clientConfig: S3ClientConfig = {
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.client = new S3Client(clientConfig);
  }

  async upload(input: StorageUploadInput): Promise<StoredUploadFile> {
    const objectKey = buildObjectKey(input);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        Body: input.buffer,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        Metadata: {
          tenantid: input.tenantId,
          module: normalizeModuleName(input.moduleName),
        },
      })
    );

    const secureUrl = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
      { expiresIn: this.config.signedUrlTtlSeconds }
    );

    const secureUrlExpiresAt = new Date(
      Date.now() + this.config.signedUrlTtlSeconds * 1000
    ).toISOString();

    const publicUrl = this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/+$/, "")}/${objectKey}`
      : null;

    return {
      provider: this.provider,
      key: objectKey,
      url: publicUrl ?? secureUrl,
      secureUrl,
      secureUrlExpiresAt,
      contentType: input.contentType,
      size: input.contentLength,
      originalName: input.originalName,
      moduleName: normalizeModuleName(input.moduleName),
      tenantId: input.tenantId,
    };
  }
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizeModuleName(moduleName: string): string {
  return moduleName.trim().toLowerCase();
}

function buildObjectKey(input: StorageUploadInput): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const sanitizedModule = normalizeModuleName(input.moduleName);
  const fileName = `${Date.now()}-${randomUUID()}.${input.extension}`;
  return `uploads/tenants/${input.tenantId}/${sanitizedModule}/${year}/${month}/${day}/${fileName}`;
}

function getS3ConfigFromEnv(strict: boolean): S3StorageConfig | null {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET ?? process.env.R2_BUCKET_NAME;
  const endpoint =
    process.env.S3_ENDPOINT ??
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined);

  const hasAnyS3Setting =
    Boolean(accessKeyId) ||
    Boolean(secretAccessKey) ||
    Boolean(bucket) ||
    Boolean(endpoint) ||
    Boolean(process.env.S3_REGION);

  if (!accessKeyId || !secretAccessKey || !bucket) {
    if (strict) {
      throw new Error(
        "Storage S3 configurado, mas faltam variaveis obrigatorias: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY e S3_BUCKET."
      );
    }
    if (hasAnyS3Setting) {
      throw new Error(
        "Configuracao S3 parcial detectada. Revise as variaveis de storage no ambiente."
      );
    }
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    region: process.env.S3_REGION ?? "auto",
    endpoint,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_URL,
    forcePathStyle: parseBooleanEnv(process.env.S3_FORCE_PATH_STYLE, false),
    signedUrlTtlSeconds: parsePositiveInt(
      process.env.S3_SIGNED_URL_TTL_SECONDS,
      DEFAULT_SIGNED_URL_TTL_SECONDS
    ),
  };
}

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  const driver = (process.env.STORAGE_DRIVER ?? "").trim().toLowerCase();

  if (driver === "local") {
    cachedProvider = new LocalStorageProvider();
    return cachedProvider;
  }

  if (driver === "s3") {
    cachedProvider = new S3StorageProvider(getS3ConfigFromEnv(true)!);
    return cachedProvider;
  }

  const autoS3Config = getS3ConfigFromEnv(false);
  cachedProvider = autoS3Config
    ? new S3StorageProvider(autoS3Config)
    : new LocalStorageProvider();

  return cachedProvider;
}

export function getStorageDriverName(): StorageDriver {
  const provider = getStorageProvider();
  return provider instanceof S3StorageProvider ? "s3" : "local";
}

