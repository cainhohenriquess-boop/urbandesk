import test from "node:test";
import assert from "node:assert/strict";
import {
  storeInfrastructureArchive,
  type InfrastructureArchiveStorageResult,
} from "@/lib/infrastructure-layer-storage";

const baseUploadInput = {
  buffer: Buffer.from("zip-content"),
  contentLength: 11,
  contentType: "application/zip",
  extension: "zip",
  moduleName: "infra-ponnot",
  originalName: "PONNOT.zip",
  tenantId: "cmtenant123",
} as const;

test("persiste o arquivo quando o provider responde com sucesso", async () => {
  const expectedResult = {
    provider: "s3" as const,
    key: "uploads/tenants/cmtenant123/infra-ponnot/2026/03/14/file.zip",
    url: "https://bucket.example/file.zip",
    secureUrl: "https://signed.example/file.zip",
    secureUrlExpiresAt: "2026-03-14T10:00:00.000Z",
    contentType: "application/zip",
    size: 11,
    originalName: "PONNOT.zip",
    moduleName: "infra-ponnot",
    tenantId: "cmtenant123",
  };

  const result = await storeInfrastructureArchive({
    driverName: "s3",
    provider: {
      async upload() {
        return expectedResult;
      },
    },
    upload: baseUploadInput,
  });

  assert.deepEqual(result, {
    storedArchive: expectedResult,
    archivePersisted: true,
    warning: null,
  } satisfies InfrastructureArchiveStorageResult);
});

test("faz fallback seguro quando o ambiente local nao consegue gravar o ZIP", async () => {
  const error = Object.assign(
    new Error("ENOENT: no such file or directory, mkdir '/var/task/public/uploads'"),
    { code: "ENOENT" }
  );

  const result = await storeInfrastructureArchive({
    driverName: "local",
    provider: {
      async upload() {
        throw error;
      },
    },
    upload: baseUploadInput,
  });

  assert.equal(result.archivePersisted, false);
  assert.equal(result.storedArchive.provider, "local");
  assert.equal(result.storedArchive.originalName, "PONNOT.zip");
  assert.equal(result.storedArchive.url, "");
  assert.match(result.storedArchive.key, /^uploads\/tenants\/cmtenant123\/infra-ponnot\//);
  assert.match(result.warning ?? "", /storage persistente não está configurado/i);
});

test("mantem o erro original quando o provider nao e local", async () => {
  const error = new Error("Falha remota no bucket");

  await assert.rejects(
    () =>
      storeInfrastructureArchive({
        driverName: "s3",
        provider: {
          async upload() {
            throw error;
          },
        },
        upload: baseUploadInput,
      }),
    error
  );
});
