"use client";

import { useMemo, useState } from "react";
import {
  INFRASTRUCTURE_LAYER_CODES,
  INFRASTRUCTURE_LAYER_DESCRIPTIONS,
  INFRASTRUCTURE_LAYER_LABELS,
  type InfrastructureLayerCodeId,
} from "@/lib/infrastructure-layer-config";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  state: string;
  status: string;
};

type InfrastructureLayerRecord = {
  id: string;
  code: InfrastructureLayerCodeId;
  name: string;
  description: string | null;
  status: string;
  featureCount: number;
  geometryType: string | null;
  originalCrs: string | null;
  sourceArchiveName: string;
  sourceDatasetName: string | null;
  createdAt: string;
  ownerTenant: TenantOption | null;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  authorizedTenants: Array<{
    tenant: TenantOption;
  }>;
};

type InfrastructureLayerUploadRecord = {
  id: string;
  code: InfrastructureLayerCodeId;
  status: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  uploadMetadata: unknown;
  processingResult: unknown;
  processingError: string | null;
  uploadedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerTenant: TenantOption | null;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  finalLayer: {
    id: string;
    code: InfrastructureLayerCodeId;
    name: string;
    status: string;
    featureCount: number;
    createdAt: string;
  } | null;
  authorizedTenants: Array<{
    tenant: TenantOption;
  }>;
};

type InfrastructureLayerListResponse = {
  data: {
    layers: InfrastructureLayerRecord[];
    uploads: InfrastructureLayerUploadRecord[];
  };
};

type UploadMetadata = {
  originalFileName: string | null;
  archiveSizeBytes: number | null;
  requestedCode: string | null;
  inspection: {
    datasetName: string | null;
  } | null;
};

type ProcessingResult = {
  featureCount: number | null;
  geometryType: string | null;
  error: {
    code: string | null;
    message: string | null;
  } | null;
};

type InfrastructureLayerManagerProps = {
  tenants: TenantOption[];
  layers: InfrastructureLayerRecord[];
  uploads: InfrastructureLayerUploadRecord[];
  preselectedTenantId?: string | null;
  schemaReady: boolean;
  schemaNotice?: string | null;
};

const STATUS_TONE: Record<string, string> = {
  READY: "border-emerald-200 bg-emerald-100 text-emerald-800",
  PROCESSING: "border-brand-200 bg-brand-100 text-brand-800",
  PROCESSED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  FAILED: "border-danger-200 bg-danger-100 text-danger-800",
  UPLOADED: "border-slate-200 bg-slate-100 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  READY: "Publicada",
  PROCESSING: "Processando",
  PROCESSED: "Processado",
  FAILED: "Falhou",
  UPLOADED: "Recebido",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getUploadMetadata(upload: InfrastructureLayerUploadRecord): UploadMetadata {
  const metadata = isRecord(upload.uploadMetadata) ? upload.uploadMetadata : {};
  const inspection = isRecord(metadata.inspection) ? metadata.inspection : null;

  return {
    originalFileName:
      typeof metadata.originalFileName === "string"
        ? metadata.originalFileName
        : null,
    archiveSizeBytes:
      typeof metadata.archiveSizeBytes === "number"
        ? metadata.archiveSizeBytes
        : null,
    requestedCode:
      typeof metadata.requestedCode === "string" ? metadata.requestedCode : null,
    inspection: inspection
      ? {
          datasetName:
            typeof inspection.datasetName === "string"
              ? inspection.datasetName
              : null,
        }
      : null,
  };
}

function getProcessingResult(upload: InfrastructureLayerUploadRecord): ProcessingResult {
  const result = isRecord(upload.processingResult) ? upload.processingResult : {};
  const error = isRecord(result.error) ? result.error : null;

  return {
    featureCount:
      typeof result.featureCount === "number" ? result.featureCount : null,
    geometryType:
      typeof result.geometryType === "string" ? result.geometryType : null,
    error: error
      ? {
          code: typeof error.code === "string" ? error.code : null,
          message: typeof error.message === "string" ? error.message : null,
        }
      : null,
  };
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} KB`;
  }
  return `${formatNumber(bytes)} B`;
}

function getStatusClassName(status: string) {
  return STATUS_TONE[status] ?? "border-slate-200 bg-slate-100 text-slate-700";
}

function getStatusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

async function requestInfrastructureLayerLists() {
  const response = await fetch("/api/admin/infrastructure-layers", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | InfrastructureLayerListResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Falha ao atualizar a listagem (${response.status}).`
    );
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Resposta inválida ao listar uploads de infraestrutura.");
  }

  return payload.data;
}

async function uploadInfrastructureLayer(
  formData: FormData,
  onUploadProgress: (progress: number) => void,
  onProcessingStart: () => void
) {
  return new Promise<{
    success: boolean;
    data?: InfrastructureLayerRecord;
    upload?: InfrastructureLayerUploadRecord;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/infrastructure-layers");
    xhr.responseType = "json";

    xhr.upload.addEventListener("loadstart", () => {
      onUploadProgress(0);
    });

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.upload.addEventListener("loadend", () => {
      onProcessingStart();
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Falha de rede ao enviar o shapefile."));
    });

    xhr.addEventListener("load", () => {
      const payload =
        xhr.response ??
        (() => {
          try {
            return xhr.responseText ? JSON.parse(xhr.responseText) : null;
          } catch {
            return null;
          }
        })();

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }

      reject(
        new Error(
          payload && typeof payload.error === "string"
            ? payload.error
            : `Falha no upload (${xhr.status}).`
        )
      );
    });

    xhr.send(formData);
  });
}

function SummaryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "brand" | "success";
}) {
  const toneClassName = {
    default: "border-border bg-background",
    danger: "border-danger-200 bg-danger-50",
    brand: "border-brand-200 bg-brand-50",
    success: "border-emerald-200 bg-emerald-50",
  }[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-4", toneClassName)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function InfrastructureLayerManager({
  tenants,
  layers: initialLayers,
  uploads: initialUploads,
  preselectedTenantId,
  schemaReady,
  schemaNotice,
}: InfrastructureLayerManagerProps) {
  const [layers, setLayers] = useState(initialLayers);
  const [uploads, setUploads] = useState(initialUploads);
  const [code, setCode] = useState<InfrastructureLayerCodeId>("PONNOT");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>(
    preselectedTenantId ? [preselectedTenantId] : []
  );
  const [ownerTenantId, setOwnerTenantId] = useState(preselectedTenantId ?? "");
  const [tenantSearch, setTenantSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "processing">(
    "idle"
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredTenants = useMemo(() => {
    const normalized = tenantSearch.trim().toLowerCase();
    if (!normalized) return tenants;
    return tenants.filter((tenant) =>
      `${tenant.name} ${tenant.state} ${tenant.slug}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [tenantSearch, tenants]);

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => selectedTenantIds.includes(tenant.id)),
    [selectedTenantIds, tenants]
  );

  const uploadMetrics = useMemo(() => {
    const processed = uploads.filter((item) => item.status === "PROCESSED").length;
    const failed = uploads.filter((item) => item.status === "FAILED").length;
    const processing = uploads.filter(
      (item) => item.status === "PROCESSING" || item.status === "UPLOADED"
    ).length;

    return {
      total: uploads.length,
      processed,
      failed,
      processing,
    };
  }, [uploads]);

  function toggleTenant(tenantId: string) {
    setSelectedTenantIds((current) =>
      current.includes(tenantId)
        ? current.filter((item) => item !== tenantId)
        : [...current, tenantId]
    );
    setOwnerTenantId((current) => (current === tenantId ? "" : current));
  }

  function resetFormState() {
    setDescription("");
    setName("");
    setFile(null);
    setUploadPhase("idle");
    setUploadProgress(0);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await requestInfrastructureLayerLists();
      setLayers(data.layers);
      setUploads(data.uploads);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Falha ao atualizar a listagem de camadas."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schemaReady) {
      setError(
        schemaNotice ||
          "As tabelas de infraestrutura elétrica ainda não existem neste ambiente."
      );
      return;
    }

    if (!file) {
      setError("Selecione o arquivo ZIP do shapefile.");
      return;
    }

    if (selectedTenantIds.length === 0) {
      setError("Selecione ao menos uma prefeitura autorizada.");
      return;
    }

    setIsSubmitting(true);
    setUploadPhase("uploading");
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("code", code);
      formData.set("file", file);
      if (name.trim()) formData.set("name", name.trim());
      if (description.trim()) formData.set("description", description.trim());
      if (ownerTenantId.trim()) formData.set("ownerTenantId", ownerTenantId.trim());
      selectedTenantIds.forEach((tenantId) => formData.append("tenantIds", tenantId));

      const payload = await uploadInfrastructureLayer(
        formData,
        (progress) => {
          setUploadProgress(progress);
        },
        () => {
          setUploadPhase("processing");
          setUploadProgress(100);
        }
      );

      if (payload.data) {
        setLayers((current) => [
          payload.data!,
          ...current.filter((item) => item.id !== payload.data!.id),
        ]);
      }

      if (payload.upload) {
        setUploads((current) => [
          payload.upload!,
          ...current.filter((item) => item.id !== payload.upload!.id),
        ]);
      }

      setSuccess(
        payload.data
          ? `Camada ${payload.data.name} processada e publicada com sucesso.`
          : "Camada processada e publicada com sucesso."
      );
      resetFormState();
      await handleRefresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Falha ao enviar shapefile."
      );
    } finally {
      setIsSubmitting(false);
      setUploadPhase("idle");
      setUploadProgress(0);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Publicação elétrica
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground">
              Novo upload de shapefile
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Envie um arquivo <code>.zip</code> contendo <code>.shp</code>,{" "}
              <code>.shx</code>, <code>.dbf</code>, <code>.prj</code> e, se
              existir, <code>.cpg</code>.
            </p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Prefeituras
            </p>
            <p className="mt-1 text-lg font-bold text-brand-700">
              {formatNumber(selectedTenantIds.length)}
            </p>
          </div>
        </div>

        {schemaReady ? null : schemaNotice ? (
          <div className="mt-6 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900">
            {schemaNotice}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Camada
            </label>
            <select
              value={code}
              disabled={!schemaReady || isSubmitting}
              onChange={(event) => setCode(event.target.value as InfrastructureLayerCodeId)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {INFRASTRUCTURE_LAYER_CODES.map((layerCode) => (
                <option key={layerCode} value={layerCode}>
                  {INFRASTRUCTURE_LAYER_LABELS[layerCode]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {INFRASTRUCTURE_LAYER_DESCRIPTIONS[code]}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Município ou entidade dona do dado
            </label>
            <select
              value={ownerTenantId}
              disabled={!schemaReady || isSubmitting}
              onChange={(event) => setOwnerTenantId(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {selectedTenantIds.length === 1
                  ? "Inferir automaticamente da prefeitura autorizada"
                  : "Selecione o município dono do dado"}
              </option>
              {selectedTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} · {tenant.state}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Esse vínculo identifica a origem do dado e precisa coincidir com
              uma prefeitura autorizada a visualizar a camada.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Nome de exibição
            </label>
            <input
              value={name}
              disabled={!schemaReady || isSubmitting}
              onChange={(event) => setName(event.target.value)}
              placeholder={INFRASTRUCTURE_LAYER_LABELS[code]}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Descrição
            </label>
            <textarea
              value={description}
              disabled={!schemaReady || isSubmitting}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Origem da base, vigência, observações operacionais..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Arquivo ZIP
            </label>
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              disabled={!schemaReady || isSubmitting}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-muted-foreground">
              O backend valida integridade, arquivos obrigatórios, geometria e
              autorização antes de publicar a camada.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Prefeituras autorizadas
              </label>
              <span className="text-xs font-medium text-muted-foreground">
                {formatNumber(selectedTenantIds.length)} selecionada(s)
              </span>
            </div>
            <input
              value={tenantSearch}
              disabled={!schemaReady || isSubmitting}
              onChange={(event) => setTenantSearch(event.target.value)}
              placeholder="Filtrar município..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background p-3">
              {filteredTenants.map((tenant) => {
                const checked = selectedTenantIds.includes(tenant.id);
                return (
                  <label
                    key={tenant.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                      checked
                        ? "border-brand-300 bg-brand-50"
                        : "border-border hover:bg-muted",
                      (!schemaReady || isSubmitting) && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!schemaReady || isSubmitting}
                      onChange={() => toggleTenant(tenant.id)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {tenant.name} · {tenant.state}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {tenant.slug} · {tenant.status}
                      </p>
                    </div>
                  </label>
                );
              })}

              {filteredTenants.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                  Nenhuma prefeitura corresponde ao filtro informado.
                </p>
              ) : null}
            </div>
          </div>

          {uploadPhase !== "idle" ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {uploadPhase === "uploading"
                      ? "Enviando shapefile"
                      : "Arquivo enviado, processando no servidor"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {file ? file.name : "Aguarde enquanto o processamento termina."}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700">
                  {uploadPhase === "uploading" ? `${uploadProgress}%` : "Processando"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100">
                <div
                  className={cn(
                    "h-full rounded-full bg-brand-600 transition-all",
                    uploadPhase === "processing" && "animate-pulse"
                  )}
                  style={{
                    width: `${uploadPhase === "processing" ? 100 : uploadProgress}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!schemaReady || isSubmitting}
              className={cn(
                "flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed",
                !schemaReady || isSubmitting
                  ? "bg-slate-400"
                  : "bg-brand-600 hover:bg-brand-500"
              )}
            >
              {!schemaReady
                ? "Migration pendente no ambiente"
                : isSubmitting
                  ? uploadPhase === "processing"
                    ? "Processando shapefile..."
                    : "Enviando shapefile..."
                  : "Processar e publicar camada"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleRefresh();
              }}
              disabled={isRefreshing || isSubmitting}
              className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Histórico de uploads
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground">
                Processamentos já enviados
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Acompanhe o status do processamento, identifique falhas e confira
                quais municípios receberam cada camada.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <SummaryMetric label="Uploads" value={formatNumber(uploadMetrics.total)} />
            <SummaryMetric
              label="Processados"
              value={formatNumber(uploadMetrics.processed)}
              tone="success"
            />
            <SummaryMetric
              label="Em andamento"
              value={formatNumber(uploadMetrics.processing)}
              tone="brand"
            />
            <SummaryMetric
              label="Falhas"
              value={formatNumber(uploadMetrics.failed)}
              tone="danger"
            />
          </div>

          <div className="mt-6 space-y-4">
            {!schemaReady && schemaNotice ? (
              <div className="rounded-2xl border border-dashed border-warning-200 bg-warning-50 px-6 py-12 text-center">
                <p className="text-base font-semibold text-foreground">
                  Histórico indisponível neste ambiente
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{schemaNotice}</p>
              </div>
            ) : uploads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
                <p className="text-base font-semibold text-foreground">
                  Nenhum upload enviado ainda
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Assim que o primeiro shapefile for enviado, o histórico passa a
                  mostrar status, processamento e municípios autorizados.
                </p>
              </div>
            ) : (
              uploads.map((upload) => {
                const metadata = getUploadMetadata(upload);
                const result = getProcessingResult(upload);

                return (
                  <article
                    key={upload.id}
                    className="rounded-2xl border border-border bg-background px-5 py-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800">
                            {upload.code}
                          </span>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                              getStatusClassName(upload.status)
                            )}
                          >
                            {getStatusLabel(upload.status)}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-semibold text-foreground">
                          {metadata.originalFileName || "Arquivo sem nome informado"}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Município dono do dado:{" "}
                          <span className="font-medium text-foreground">
                            {upload.ownerTenant
                              ? `${upload.ownerTenant.name} · ${upload.ownerTenant.state}`
                              : "Não informado"}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Enviado por{" "}
                          <span className="font-medium text-foreground">
                            {upload.uploadedBy.name || "Superadmin"}
                          </span>
                          {upload.uploadedBy.email
                            ? ` · ${upload.uploadedBy.email}`
                            : ""}
                        </p>
                      </div>

                      <div className="grid min-w-[250px] gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Enviado em</span>
                          <strong className="text-foreground">
                            {formatDateTime(upload.uploadedAt)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Processado em</span>
                          <strong className="text-foreground">
                            {upload.processedAt
                              ? formatDateTime(upload.processedAt)
                              : "-"}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Tamanho</span>
                          <strong className="text-foreground">
                            {formatFileSize(metadata.archiveSizeBytes)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-border px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Processamento
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          Dataset: {metadata.inspection?.datasetName || "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Feições:{" "}
                          {result.featureCount !== null
                            ? formatNumber(result.featureCount)
                            : "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Geometria: {result.geometryType || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Camada final
                        </p>
                        {upload.finalLayer ? (
                          <>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {upload.finalLayer.name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {upload.finalLayer.code} ·{" "}
                              {formatNumber(upload.finalLayer.featureCount)} feições
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Publicada em {formatDateTime(upload.finalLayer.createdAt)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Nenhuma camada final vinculada ainda.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-border px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Prefeituras autorizadas
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {upload.authorizedTenants.map(({ tenant }) => (
                            <span
                              key={tenant.id}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              {tenant.name} · {tenant.state}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {upload.processingError || result.error?.message ? (
                      <div className="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
                        <p className="font-semibold">Erro de processamento</p>
                        <p className="mt-1">
                          {upload.processingError || result.error?.message}
                        </p>
                        {result.error?.code ? (
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-danger-700">
                            Código: {result.error.code}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Catálogo publicado
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground">
                Camadas elétricas disponíveis
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Somente as prefeituras autorizadas recebem essas camadas na rota{" "}
                <code>/api/baselayers</code>.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Total publicado
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatNumber(layers.length)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {!schemaReady && schemaNotice ? (
              <div className="rounded-2xl border border-dashed border-warning-200 bg-warning-50 px-6 py-12 text-center">
                <p className="text-base font-semibold text-foreground">
                  Upload indisponível neste ambiente
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{schemaNotice}</p>
              </div>
            ) : layers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
                <p className="text-base font-semibold text-foreground">
                  Nenhuma camada elétrica publicada ainda
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  O primeiro upload aqui já sai pronto para aparecer no mapa das
                  prefeituras autorizadas.
                </p>
              </div>
            ) : (
              layers.map((layer) => (
                <article
                  key={layer.id}
                  className="rounded-2xl border border-border bg-background px-5 py-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-800">
                          {layer.code}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            getStatusClassName(layer.status)
                          )}
                        >
                          {getStatusLabel(layer.status)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-foreground">
                        {layer.name}
                      </h3>
                      {layer.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {layer.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid min-w-[220px] gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Feições</span>
                        <strong className="text-foreground">
                          {formatNumber(layer.featureCount)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Geometria</span>
                        <strong className="text-foreground">
                          {layer.geometryType || "-"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Publicada em</span>
                        <strong className="text-foreground">
                          {formatDateTime(layer.createdAt)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border border-border px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Origem
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {layer.sourceArchiveName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dataset: {layer.sourceDatasetName || "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        CRS original: {layer.originalCrs ? "informado" : "não identificado"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Município dono
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {layer.ownerTenant
                          ? `${layer.ownerTenant.name} · ${layer.ownerTenant.state}`
                          : "Não informado"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Publicado por
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {layer.uploadedBy?.name || "Superadmin"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {layer.uploadedBy?.email || "sem e-mail"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Prefeituras autorizadas
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {layer.authorizedTenants.map(({ tenant }) => (
                          <span
                            key={tenant.id}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            {tenant.name} · {tenant.state}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
