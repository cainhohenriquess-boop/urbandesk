"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn, formatCoords } from "@/lib/utils";

// ─────────────────────────────────────────────
// Tipos exportados para uso externo
// ─────────────────────────────────────────────
export interface GpsCoords {
  lat:      number;
  lng:      number;
  accuracy: number;
  altitude?: number | null;
}

export interface AssetDraft {
  name:        string;
  description: string;
  type:        string;
  coords:      GpsCoords | null;
  photos:      string[];           // base64
  attributes:  Record<string, string>;
}

export interface GpsCameraFormProps {
  /** Campos extras específicos do tipo de ativo */
  extraFields?: { key: string; label: string; placeholder?: string; required?: boolean }[];
  /** Chamado com os dados preenchidos ao submeter */
  onSubmit:     (draft: AssetDraft) => Promise<void> | void;
  /** Chamado ao cancelar */
  onCancel?:    () => void;
  /** Tipo pré-selecionado */
  defaultType?: string;
  /** Máximo de fotos */
  maxPhotos?:   number;
  className?:   string;
}

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────
function GpsBar({ accuracy }: { accuracy: number }) {
  const bars = accuracy < 5 ? 3 : accuracy < 15 ? 2 : 1;
  const label = accuracy < 5 ? "Alta" : accuracy < 15 ? "Média" : "Baixa";
  const color = accuracy < 5 ? "bg-accent-500" : accuracy < 15 ? "bg-warning-500" : "bg-danger-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-0.5 h-4">
        {[1,2,3].map((b) => (
          <div key={b} className={cn("w-1.5 rounded-sm", b <= bars ? color : "bg-muted")} style={{ height:`${b*33}%` }} />
        ))}
      </div>
      <span className={cn("text-[10px] font-medium", accuracy < 5 ? "text-accent-600" : accuracy < 15 ? "text-warning-600" : "text-danger-600")}>
        Precisão {label} (±{Math.round(accuracy)}m)
      </span>
    </div>
  );
}

function FieldInput({
  label, placeholder, value, onChange, required, type = "text",
}: {
  label: string; placeholder?: string; value: string;
  onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300 transition-colors"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// GpsCameraForm
// ─────────────────────────────────────────────
export function GpsCameraForm({
  extraFields = [],
  onSubmit,
  onCancel,
  defaultType = "PONTO",
  maxPhotos   = 5,
  className,
}: GpsCameraFormProps) {
  const [draft, setDraft] = useState<AssetDraft>({
    name:       "",
    description:"",
    type:       defaultType,
    coords:     null,
    photos:     [],
    attributes: {},
  });

  const [gpsState, setGpsState] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);

  // Monitor online
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Helpers ──
  const updateField = (field: keyof AssetDraft, value: any) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const updateAttr = (key: string, value: string) =>
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [key]: value } }));

  // ── GPS ──
  const captureGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS não disponível neste dispositivo.");
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((d) => ({
          ...d,
          coords: {
            lat:      pos.coords.latitude,
            lng:      pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
          },
        }));
        setGpsState("success");
      },
      () => {
        setGpsError("Não foi possível obter localização. Verifique as permissões do navegador.");
        setGpsState("error");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 5_000 }
    );
  }, []);

  // ── Fotos ──
  const handlePhotos = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, maxPhotos - draft.photos.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        setDraft((d) => ({
          ...d,
          photos: [...d.photos, b64].slice(0, maxPhotos),
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [draft.photos.length, maxPhotos]);

  const removePhoto = (i: number) =>
    setDraft((d) => ({ ...d, photos: d.photos.filter((_, j) => j !== i) }));

  // ── Submit ──
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(draft);
    } finally {
      setSubmitting(false);
    }
  }, [draft, onSubmit]);

  const canSubmit = draft.name.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-5", className)}>

      {/* Status online */}
      <div className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
        isOnline ? "bg-accent-50 text-accent-700" : "bg-warning-50 text-warning-700"
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-accent-500 animate-pulse-dot" : "bg-warning-500")} />
        {isOnline ? "Online — dados serão enviados imediatamente" : "Offline — dados salvos localmente"}
      </div>

      {/* Identificação */}
      <div className="space-y-3">
        <FieldInput
          label="Nome / Identificação"
          placeholder="Ex: Bueiro Av. Domingos Olímpio, nº 320"
          value={draft.name}
          onChange={(v) => updateField("name", v)}
          required
        />
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</label>
          <textarea
            value={draft.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Estado atual, urgência, notas de campo…"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>
      </div>

      {/* Campos extras por tipo */}
      {extraFields.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Atributos específicos</p>
          {extraFields.map((f) => (
            <FieldInput
              key={f.key}
              label={f.label}
              placeholder={f.placeholder}
              value={draft.attributes[f.key] ?? ""}
              onChange={(v) => updateAttr(f.key, v)}
              required={f.required}
            />
          ))}
        </div>
      )}

      {/* GPS */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Localização GPS</p>
        <button
          type="button"
          onClick={captureGps}
          disabled={gpsState === "loading"}
          className={cn(
            "w-full rounded-xl border-2 border-dashed py-5 text-center transition-all",
            gpsState === "success" ? "border-accent-400 bg-accent-50" :
            gpsState === "error"   ? "border-danger-300 bg-danger-50" :
            "border-border bg-muted/20 hover:border-brand-400 hover:bg-brand-50"
          )}
        >
          {gpsState === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl animate-spin inline-block">🛰</span>
              <p className="text-sm font-medium text-foreground">Buscando sinal…</p>
            </div>
          )}
          {gpsState === "success" && draft.coords && (
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm font-medium text-accent-700">✓ Localização capturada</p>
              <p className="geo-label text-accent-600">{formatCoords(draft.coords.lat, draft.coords.lng)}</p>
              <GpsBar accuracy={draft.coords.accuracy} />
              <p className="mt-1 text-[10px] text-brand-600 underline">Recapturar</p>
            </div>
          )}
          {(gpsState === "idle" || gpsState === "error") && (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-3xl">🛰</span>
              <p className="text-sm font-medium text-foreground">Capturar GPS</p>
              <p className="text-xs text-muted-foreground">Alta precisão</p>
            </div>
          )}
        </button>

        {gpsError && (
          <p className="text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
            {gpsError}
          </p>
        )}

        {/* Coordenadas manuais */}
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors list-none flex items-center justify-between">
            <span>Informar coordenadas manualmente</span>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="grid grid-cols-2 gap-2 p-3 pt-0">
            <FieldInput
              label="Latitude" placeholder="-3.7319"
              value={draft.coords?.lat.toString() ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, coords: { lat:+v, lng:d.coords?.lng??0, accuracy:999 } }))}
            />
            <FieldInput
              label="Longitude" placeholder="-38.5267"
              value={draft.coords?.lng.toString() ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, coords: { lat:d.coords?.lat??0, lng:+v, accuracy:999 } }))}
            />
          </div>
        </details>
      </div>

      {/* Fotos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fotos de Campo</p>
          <span className="text-[10px] text-muted-foreground">{draft.photos.length}/{maxPhotos}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {draft.photos.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-white text-[10px] hover:bg-danger-700 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}

          {draft.photos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
            >
              <span className="text-xl">📷</span>
              <span className="text-[10px]">Foto</span>
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handlePhotos}
        />
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex-1 rounded-xl bg-accent-600 py-3 text-sm font-medium text-white hover:bg-accent-500 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {submitting ? "Salvando…" : "✓ Salvar Ativo"}
        </button>
      </div>
    </form>
  );
}
