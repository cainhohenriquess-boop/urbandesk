"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn, formatCoords, formatDateTime } from "@/lib/utils";

type AssetType  = "PONTO" | "TRECHO" | "AREA";
type SyncStatus = "pending" | "syncing" | "synced" | "error";

interface CapturedAsset {
  id: string; type: AssetType; name: string; note: string;
  lat: number | null; lng: number | null; photos: string[];
  createdAt: string; sync: SyncStatus;
}

const SYNC_CONFIG: Record<SyncStatus, { label: string; color: string; spin?: boolean }> = {
  pending: { label: "Pendente",     color: "text-warning-500" },
  syncing: { label: "Enviando…",    color: "text-brand-500",  spin: true },
  synced:  { label: "Sincronizado", color: "text-accent-500" },
  error:   { label: "Erro",         color: "text-danger-500" },
};

const ASSET_TYPES: { value: AssetType; label: string; desc: string }[] = [
  { value: "PONTO",  label: "Ponto",  desc: "Hidrante, bueiro…" },
  { value: "TRECHO", label: "Trecho", desc: "Via, rede…" },
  { value: "AREA",   label: "Área",   desc: "Lote, praça…" },
];

export default function CampoPage() {
  const [tab, setTab]             = useState<"capturar" | "fila">("capturar");
  const [assetType, setAssetType] = useState<AssetType>("PONTO");
  const [name, setName]           = useState("");
  const [note, setNote]           = useState("");
  
  // ✅ NOVA LÓGICA DE FOTOS: Arquivos reais e previews leves
  const [photos, setPhotos]       = useState<File[]>([]);
  const [previews, setPreviews]   = useState<string[]>([]);
  
  const [coords, setCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [queue, setQueue]         = useState<CapturedAsset[]>([]);
  const [isOnline, setIsOnline]   = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online",  update);
    window.addEventListener("offline", update);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const handleGetGps = useCallback(() => {
    setGpsLoading(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      ()    => { setGpsError("GPS indisponível. Verifique as permissões."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  // ✅ CRIA PREVIEWS SEM GASTAR MEMÓRIA DO CELULAR
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setPhotos((prev) => {
      const newPhotos = [...prev, ...files].slice(0, 5); // Máximo 5 fotos
      return newPhotos;
    });

    setPreviews((prev) => {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      return [...prev, ...newPreviews].slice(0, 5);
    });
  }, []);

  // ✅ LIMPA A MEMÓRIA AO REMOVER FOTO
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]); 
    setPhotos((p) => p.filter((_, i) => i !== index));
    setPreviews((p) => p.filter((_, i) => i !== index));
  };

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);

    let finalPhotoUrls: string[] = [];

    // ✅ PASSO 1: UPLOAD PARA O STORAGE VIA FORMDATA
    if (isOnline && photos.length > 0) {
      const formData = new FormData();
      photos.forEach((file) => formData.append("files", file));

      try {
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalPhotoUrls = uploadData.urls;
        }
      } catch (err) {
        console.error("Erro ao subir fotos:", err);
      }
    }

    // Se estiver offline ou falhar, salva uma string temporária
    if (finalPhotoUrls.length === 0 && photos.length > 0) {
      finalPhotoUrls = previews; 
    }

    // ✅ PASSO 2: SALVA NO POSTGRESQL APENAS AS URLs LEVES
    const asset: CapturedAsset = {
      id: crypto.randomUUID(), type: assetType, name: name.trim(),
      note: note.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      photos: finalPhotoUrls,
      createdAt: new Date().toISOString(), sync: isOnline ? "syncing" : "pending",
    };
    
    setQueue((prev) => [asset, ...prev]);

    if (isOnline) {
      try {
        await fetch("/api/gis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(asset) });
        setQueue((prev) => prev.map((a) => a.id === asset.id ? { ...a, sync: "synced" } : a));
      } catch {
        setQueue((prev) => prev.map((a) => a.id === asset.id ? { ...a, sync: "error" } : a));
      }
    }

    // Reset Form
    setName(""); setNote(""); 
    previews.forEach(url => URL.revokeObjectURL(url)); // Limpa memória
    setPhotos([]); setPreviews([]); 
    setCoords(null);
    setSubmitting(false); setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  const pendingCount = queue.filter((a) => a.sync === "pending" || a.sync === "error").length;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-700 text-foreground">App de Campo</h1>
          <p className="text-sm text-muted-foreground">Captura offline-first de ativos GIS</p>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
          isOnline ? "bg-accent-100 text-accent-700" : "bg-warning-100 text-warning-700")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-accent-500 animate-pulse-dot" : "bg-warning-500")} />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        {(["capturar", "fila"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("relative flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {{ capturar: "Capturar Ativo", fila: "Fila de Envio" }[t]}
            {t === "fila" && pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning-500 text-[9px] font-700 text-white">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── CAPTURAR ── */}
      {tab === "capturar" && (
        <div className="space-y-4">
          {submitted && (
            <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 animate-fade-in">
              <svg className="h-5 w-5 text-accent-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-accent-700 font-medium">
                Ativo salvo! {isOnline ? "Enviado ao servidor com sucesso." : "Será sincronizado quando houver conexão."}
              </p>
            </div>
          )}

          {/* Tipo */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo de Ativo</p>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_TYPES.map((t) => (
                <button key={t.value} onClick={() => setAssetType(t.value)}
                  className={cn("rounded-lg border p-3 text-center transition-all",
                    assetType === t.value ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-border hover:border-muted-foreground/40")}>
                  <p className={cn("text-sm font-medium", assetType === t.value ? "text-brand-700 dark:text-brand-300" : "text-foreground")}>{t.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nome e nota */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do Ativo *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bueiro Av. Domingos Olímpio nº 42"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 transition-all" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações de Campo</label>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Estado de conservação, anomalias, notas técnicas…"
                className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 transition-all" />
            </div>
          </div>

          {/* GPS */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Localização GPS</p>
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
                <button onClick={handleGetGps} disabled={gpsLoading}
                  className={cn("flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-medium transition-all",
                    gpsLoading ? "border-brand-300 text-brand-500 cursor-wait" : "border-border text-muted-foreground hover:border-brand-400 hover:text-brand-600")}>
                  <svg className={cn("h-4 w-4", gpsLoading && "animate-spin")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {gpsLoading ? "Obtendo localização…" : "Capturar GPS atual"}
                </button>
                {gpsError && <p className="text-xs text-danger-600">{gpsError}</p>}
              </div>
            )}
          </div>

          {/* Fotos */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fotos ({previews.length}/5)</p>
              {previews.length < 5 && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Adicionar
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoChange} />
            {previews.length === 0 ? (
              <button onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground hover:border-brand-400 hover:text-brand-600 transition-all">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm">Tirar foto ou escolher da galeria</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!name.trim() || submitting}
            className={cn("w-full rounded-xl py-4 text-sm font-600 font-display transition-all duration-200 shadow-[0_4px_12px_rgba(52,104,246,0.3)]",
              name.trim() && !submitting ? "bg-brand-600 text-white hover:bg-brand-500 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed")}>
            {submitting ? "Salvando e Enviando…" : "Salvar Ativo no Servidor"}
          </button>
        </div>
      )}

      {/* ── FILA ── */}
      {tab === "fila" && (
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className="text-sm font-medium">Nenhum ativo capturado</p>
                <p className="text-xs mt-0.5">Vá para &quot;Capturar Ativo&quot; para começar</p>
              </div>
            </div>
          ) : (
            <>
              {pendingCount > 0 && isOnline && (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <svg className="h-4 w-4 text-brand-600 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-xs text-brand-700">{pendingCount} ativo{pendingCount > 1 ? "s" : ""} aguardando sincronização</p>
                </div>
              )}
              {queue.map((asset) => {
                const sync = SYNC_CONFIG[asset.sync];
                return (
                  <div key={asset.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="status-badge bg-slate-100 text-slate-600 text-[9px]">{asset.type}</span>
                          <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                        </div>
                        {asset.note && <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{asset.note}</p>}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                          {asset.lat && asset.lng && <span className="geo-label">{formatCoords(asset.lat, asset.lng)}</span>}
                          <span>{formatDateTime(asset.createdAt)}</span>
                          {asset.photos.length > 0 && <span>{asset.photos.length} foto{asset.photos.length > 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-1 shrink-0 text-xs font-medium", sync.color)}>
                        {sync.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
