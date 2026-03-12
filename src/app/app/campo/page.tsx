"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn, formatCoords, formatDateTime } from "@/lib/utils";
import {
  type CampoAssetType,
  type CampoQueueItem,
  type CampoSyncStatus,
  createCampoQueueItem,
  isCampoOfflineSupported,
  listCampoQueueItems,
  markCampoItemForRetry,
  removeCampoQueueItem,
  syncCampoQueueNow,
} from "@/lib/offline/campo-queue";

const MAX_PHOTOS = 5;

type ActiveTab = "capturar" | "fila";

const SYNC_CONFIG: Record<
  CampoSyncStatus,
  { label: string; color: string; description: string; spin?: boolean }
> = {
  pending: {
    label: "Pendente",
    color: "text-warning-500",
    description: "Aguardando envio para nuvem.",
  },
  syncing: {
    label: "Sincronizando",
    color: "text-brand-500",
    description: "Enviando anexos e metadados.",
    spin: true,
  },
  synced: {
    label: "Sincronizado",
    color: "text-accent-500",
    description: "Item salvo com sucesso no servidor.",
  },
  error: {
    label: "Erro",
    color: "text-danger-500",
    description: "Falha no envio. Retry automatico habilitado.",
  },
  conflict: {
    label: "Conflito",
    color: "text-danger-600",
    description: "Conflito detectado (idempotencia). Requer retry manual.",
  },
};

const ASSET_TYPES: { value: CampoAssetType; label: string; desc: string }[] = [
  { value: "PONTO", label: "Ponto", desc: "Hidrante, bueiro..." },
  { value: "TRECHO", label: "Trecho", desc: "Via, rede..." },
  { value: "AREA", label: "Area", desc: "Lote, praca..." },
];

export default function CampoPage() {
  const [tab, setTab] = useState<ActiveTab>("capturar");
  const [assetType, setAssetType] = useState<CampoAssetType>("PONTO");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [queue, setQueue] = useState<CampoQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueSyncing, setQueueSyncing] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineSupported, setOfflineSupported] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshQueue = useCallback(async () => {
    if (!isCampoOfflineSupported()) {
      setQueue([]);
      return;
    }

    const items = await listCampoQueueItems();
    setQueue(items);
  }, []);

  const runSync = useCallback(async () => {
    if (!isCampoOfflineSupported()) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    setQueueSyncing(true);
    try {
      await syncCampoQueueNow();
    } catch (error) {
      console.error("Falha ao sincronizar fila de campo:", error);
    } finally {
      await refreshQueue();
      setQueueSyncing(false);
    }
  }, [refreshQueue]);

  useEffect(() => {
    const supported = isCampoOfflineSupported();
    setOfflineSupported(supported);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false);

    if (!supported) {
      setQueueLoading(false);
      return;
    }

    let intervalId: number | null = null;

    const onOnline = () => {
      setIsOnline(true);
      void runSync();
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    void refreshQueue()
      .then(() => {
        if (navigator.onLine) {
          void runSync();
        }
      })
      .finally(() => {
        setQueueLoading(false);
      });

    intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        void runSync();
      }
    }, 15_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [refreshQueue, runSync]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleGetGps = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocalizacao indisponivel neste dispositivo.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsError("GPS indisponivel. Verifique as permissoes.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const availableSlots = Math.max(0, MAX_PHOTOS - photos.length);
      if (availableSlots === 0) return;

      const acceptedFiles = files.slice(0, availableSlots);
      if (acceptedFiles.length === 0) return;

      setPhotos((prev) => [...prev, ...acceptedFiles]);
      setPreviews((prev) => [...prev, ...acceptedFiles.map((file) => URL.createObjectURL(file))]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [photos.length]
  );

  const clearCaptureForm = useCallback(() => {
    setName("");
    setNote("");
    setCoords(null);
    setPhotos([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previews]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!isCampoOfflineSupported()) {
        throw new Error("Seu navegador nao suporta fila offline (IndexedDB).");
      }

      await createCampoQueueItem({
        assetType,
        name: name.trim(),
        note: note.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        photos,
      });

      clearCaptureForm();
      await refreshQueue();

      if (navigator.onLine) {
        await runSync();
      }

      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar ativo na fila offline:", error);
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "Falha ao salvar item localmente."
      );
    } finally {
      setSubmitting(false);
    }
  }, [assetType, clearCaptureForm, coords?.lat, coords?.lng, name, note, photos, refreshQueue, runSync]);

  const handleRetryItem = useCallback(
    async (id: string) => {
      await markCampoItemForRetry(id);
      await refreshQueue();
      if (navigator.onLine) {
        await runSync();
      }
    },
    [refreshQueue, runSync]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      await removeCampoQueueItem(id);
      await refreshQueue();
    },
    [refreshQueue]
  );

  const unsyncedCount = queue.filter((item) => item.status !== "synced").length;
  const errorCount = queue.filter((item) => item.status === "error" || item.status === "conflict").length;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-700 text-foreground">App de Campo</h1>
          <p className="text-sm text-muted-foreground">Captura offline-first com fila persistente e sync automatico</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            isOnline ? "bg-accent-100 text-accent-700" : "bg-warning-100 text-warning-700"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isOnline ? "bg-accent-500 animate-pulse-dot" : "bg-warning-500"
            )}
          />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {!offlineSupported && (
        <div className="rounded-xl border border-warning-300 bg-warning-50 px-4 py-3 text-xs text-warning-700">
          IndexedDB indisponivel neste navegador. O modo offline completo nao pode ser habilitado.
        </div>
      )}

      <div className="flex rounded-xl bg-muted p-1 gap-1">
        {(["capturar", "fila"] as const).map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => setTab(currentTab)}
            className={cn(
              "relative flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              tab === currentTab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {{ capturar: "Capturar Ativo", fila: "Fila de Envio" }[currentTab]}
            {currentTab === "fila" && unsyncedCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning-500 text-[9px] font-700 text-white">
                {unsyncedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "capturar" && (
        <div className="space-y-4">
          {submitted && (
            <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 animate-fade-in">
              <svg className="h-5 w-5 text-accent-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-accent-700 font-medium">
                Ativo salvo localmente na fila. {isOnline ? "Sincronizacao disparada." : "Sincroniza quando a conexao voltar."}
              </p>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
              <svg className="h-5 w-5 text-danger-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 8v4m0 4h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-danger-700 font-medium">{submitError}</p>
            </div>
          )}

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo de Ativo</p>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setAssetType(type.value)}
                  className={cn(
                    "rounded-lg border p-3 text-center transition-all",
                    assetType === type.value
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <p className={cn("text-sm font-medium", assetType === type.value ? "text-brand-700 dark:text-brand-300" : "text-foreground")}>{type.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do Ativo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bueiro Av. Domingos Olimpio n 42"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Observacoes de Campo</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Estado de conservacao, anomalias, notas tecnicas..."
                className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 transition-all"
              />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Localizacao GPS</p>
            {coords ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100">
                    <svg className="h-4 w-4 text-accent-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                  <p className="geo-label text-xs">{formatCoords(coords.lat, coords.lng)}</p>
                </div>
                <button onClick={() => setCoords(null)} className="text-xs text-muted-foreground hover:text-danger-600 transition-colors">Remover</button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleGetGps}
                  disabled={gpsLoading}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-medium transition-all",
                    gpsLoading
                      ? "border-brand-300 text-brand-500 cursor-wait"
                      : "border-border text-muted-foreground hover:border-brand-400 hover:text-brand-600"
                  )}
                >
                  <svg className={cn("h-4 w-4", gpsLoading && "animate-spin")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {gpsLoading ? "Obtendo localizacao..." : "Capturar GPS atual"}
                </button>
                {gpsError && <p className="text-xs text-danger-600">{gpsError}</p>}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fotos ({previews.length}/{MAX_PHOTOS})</p>
              {previews.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Adicionar
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />
            {previews.length === 0 ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground hover:border-brand-400 hover:text-brand-600 transition-all"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm">Tirar foto ou escolher da galeria</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={src} className="group relative aspect-square overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting || !offlineSupported}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-600 font-display transition-all duration-200 shadow-[0_4px_12px_rgba(52,104,246,0.3)]",
              name.trim() && !submitting && offlineSupported
                ? "bg-brand-600 text-white hover:bg-brand-500 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {submitting ? "Salvando na fila..." : "Salvar Ativo na Fila Offline"}
          </button>
        </div>
      )}

      {tab === "fila" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Fila local</p>
              <p className="text-xs text-muted-foreground">
                {queueLoading
                  ? "Carregando fila..."
                  : `${queue.length} item(ns), ${unsyncedCount} pendente(s), ${errorCount} com erro/conflito`}
              </p>
            </div>
            <button
              onClick={() => void runSync()}
              disabled={!isOnline || queueSyncing || !offlineSupported}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold transition-colors",
                isOnline && !queueSyncing && offlineSupported
                  ? "bg-brand-600 text-white hover:bg-brand-500"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {queueSyncing ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Sincronizando
                </>
              ) : (
                "Sincronizar agora"
              )}
            </button>
          </div>

          {queue.length === 0 && !queueLoading ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className="text-sm font-medium">Nenhum ativo na fila</p>
                <p className="text-xs mt-0.5">Vá para &quot;Capturar Ativo&quot; para começar</p>
              </div>
            </div>
          ) : (
            queue.map((item) => {
              const syncState = SYNC_CONFIG[item.status];
              const attachmentTotal = item.attachmentCount > 0 ? item.attachmentCount : item.uploadedPhotoUrls.length;

              return (
                <div key={item.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="status-badge bg-slate-100 text-slate-600 text-[9px]">{item.assetType}</span>
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      </div>

                      {item.note && <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{item.note}</p>}

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                        {typeof item.lat === "number" && typeof item.lng === "number" && (
                          <span className="geo-label">{formatCoords(item.lat, item.lng)}</span>
                        )}
                        <span>{formatDateTime(item.createdAt)}</span>
                        {attachmentTotal > 0 && <span>{attachmentTotal} foto(s)</span>}
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground">{syncState.description}</p>

                      {item.status === "error" && item.nextRetryAt && (
                        <p className="mt-1 text-[11px] text-warning-600">
                          Proxima tentativa automatica: {formatDateTime(item.nextRetryAt)}
                        </p>
                      )}

                      {item.lastError && (item.status === "error" || item.status === "conflict") && (
                        <p className="mt-1 text-[11px] text-danger-600">Detalhe: {item.lastError}</p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className={cn("flex items-center gap-1 text-xs font-medium", syncState.color)}>
                        {syncState.spin && (
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        )}
                        {syncState.label}
                      </div>

                      {(item.status === "error" || item.status === "conflict") && (
                        <button
                          onClick={() => void handleRetryItem(item.id)}
                          className="rounded-md bg-warning-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-warning-600 transition-colors"
                        >
                          Tentar novamente
                        </button>
                      )}

                      {(item.status === "synced" || item.status === "conflict") && (
                        <button
                          onClick={() => void handleDeleteItem(item.id)}
                          className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Remover da fila
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

