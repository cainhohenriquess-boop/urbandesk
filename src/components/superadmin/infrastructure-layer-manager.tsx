"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  authorizedTenants: Array<{
    tenant: TenantOption;
  }>;
};

type InfrastructureLayerManagerProps = {
  tenants: TenantOption[];
  layers: InfrastructureLayerRecord[];
  preselectedTenantId?: string | null;
};

const STATUS_TONE: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PROCESSING: "bg-brand-100 text-brand-800 border-brand-200",
  FAILED: "bg-danger-100 text-danger-800 border-danger-200",
};

export function InfrastructureLayerManager({
  tenants,
  layers: initialLayers,
  preselectedTenantId,
}: InfrastructureLayerManagerProps) {
  const router = useRouter();
  const [layers, setLayers] = useState(initialLayers);
  const [code, setCode] = useState<InfrastructureLayerCodeId>("PONNOT");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>(
    preselectedTenantId ? [preselectedTenantId] : []
  );
  const [tenantSearch, setTenantSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const selectedCount = selectedTenantIds.length;

  function toggleTenant(tenantId: string) {
    setSelectedTenantIds((current) =>
      current.includes(tenantId)
        ? current.filter((item) => item !== tenantId)
        : [...current, tenantId]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Selecione o arquivo ZIP do shapefile.");
      return;
    }

    if (selectedTenantIds.length === 0) {
      setError("Selecione ao menos uma prefeitura autorizada.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("code", code);
      formData.set("file", file);
      if (name.trim()) formData.set("name", name.trim());
      if (description.trim()) formData.set("description", description.trim());
      selectedTenantIds.forEach((tenantId) => formData.append("tenantIds", tenantId));

      const response = await fetch("/api/admin/infrastructure-layers", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || `Falha no upload (${response.status}).`);
      }

      if (payload?.data) {
        setLayers((current) => [payload.data as InfrastructureLayerRecord, ...current]);
      }

      setSuccess("Camada processada e publicada com sucesso.");
      setFile(null);
      setDescription("");
      setName("");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Falha ao enviar shapefile."
      );
    } finally {
      setIsSubmitting(false);
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
              O ZIP precisa conter `.shp`, `.shx`, `.dbf`, `.prj` e, se existir, `.cpg`.
            </p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Prefeituras
            </p>
            <p className="mt-1 text-lg font-bold text-brand-700">
              {formatNumber(selectedCount)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Código da camada
            </label>
            <select
              value={code}
              onChange={(event) => setCode(event.target.value as InfrastructureLayerCodeId)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500"
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
              Nome de exibição
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={INFRASTRUCTURE_LAYER_LABELS[code]}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Origem da base, vigência, observações operacionais..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Arquivo ZIP
            </label>
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-xs text-muted-foreground">
              O processamento valida integridade, arquivos obrigatórios e geometria antes de publicar.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Prefeituras autorizadas
              </label>
              <span className="text-xs font-medium text-muted-foreground">
                {formatNumber(selectedCount)} selecionada(s)
              </span>
            </div>
            <input
              value={tenantSearch}
              onChange={(event) => setTenantSearch(event.target.value)}
              placeholder="Filtrar município..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500"
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
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors",
              isSubmitting ? "bg-slate-400" : "bg-brand-600 hover:bg-brand-500"
            )}
          >
            {isSubmitting ? "Processando shapefile..." : "Processar e publicar camada"}
          </button>
        </form>
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
              Somente as prefeituras autorizadas recebem essas camadas na rota `/api/baselayers`.
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
          {layers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
              <p className="text-base font-semibold text-foreground">
                Nenhuma camada elétrica publicada ainda
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                O primeiro upload aqui já sai pronto para aparecer no mapa das prefeituras autorizadas.
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
                          STATUS_TONE[layer.status] ??
                            "border-slate-200 bg-slate-100 text-slate-700"
                        )}
                      >
                        {layer.status}
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
                      <span className="text-muted-foreground">Publicado em</span>
                      <strong className="text-foreground">
                        {formatDateTime(layer.createdAt)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
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
  );
}
