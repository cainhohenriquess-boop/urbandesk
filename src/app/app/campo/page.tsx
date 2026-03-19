"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  type CampoInspectionStatus,
  type CampoIssueStatus,
  type CampoQueueItem,
  type CampoSyncStatus,
  createCampoQueueItem,
  isCampoOfflineSupported,
  listCampoQueueItems,
  markCampoItemForRetry,
  removeCampoQueueItem,
  syncCampoQueueNow,
} from "@/lib/offline/campo-queue";
import {
  CAMPO_INSPECTION_STATUS_VALUES,
  CAMPO_ISSUE_STATUS_VALUES,
  buildCampoPhaseLabel,
  buildCampoProjectLabel,
  getCampoTechnicalAreaOptions,
  getCampoTechnicalObjectLabel,
  type CampoProjectAssetOption,
  type CampoProjectOption,
} from "@/lib/campo-project-links";
import {
  PRISMA_PROJECT_TECHNICAL_AREAS,
  getDisciplineObjectTypes,
  getTechnicalObjectLabel,
  isProjectDisciplineId,
  isTechnicalObjectType,
  type ProjectDisciplineId,
  type TechnicalObjectDefinition,
  type TechnicalObjectTypeId,
} from "@/lib/project-disciplines";
import {
  getProjectInspectionStatusLabel,
  getProjectIssueStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { cn, formatCoords, formatDateTime } from "@/lib/utils";

const MAX_PHOTOS = 5;
type ActiveTab = "capturar" | "fila";
type RecordType = "VISTORIA" | "OCORRENCIA";

type SyncVisual = { label: string; color: string; description: string; spin?: boolean };

const SYNC_CONFIG: Record<CampoSyncStatus, SyncVisual> = {
  pending: { label: "Pendente", color: "text-warning-500", description: "Aguardando envio para a nuvem." },
  syncing: { label: "Sincronizando", color: "text-brand-500", description: "Enviando anexos e metadados.", spin: true },
  synced: { label: "Sincronizado", color: "text-accent-500", description: "Registro salvo com sucesso no servidor." },
  error: { label: "Erro", color: "text-danger-500", description: "Falha no envio. Nova tentativa autom\u00e1tica habilitada." },
  conflict: { label: "Conflito", color: "text-danger-600", description: "Conflito detectado. Requer nova tentativa manual." },
};

const RECORD_TYPES: Array<{ value: RecordType; label: string; desc: string }> = [
  { value: "VISTORIA", label: "Vistoria", desc: "Fiscaliza\u00e7\u00e3o t\u00e9cnica vinculada a projeto, etapa e objeto." },
  { value: "OCORRENCIA", label: "Ocorr\u00eancia", desc: "Registro de problema, n\u00e3o conformidade ou acionamento de campo." },
];

function getFieldStatusOptions(recordType: RecordType) {
  return recordType === "VISTORIA"
    ? CAMPO_INSPECTION_STATUS_VALUES.map((value) => ({ value, label: getProjectInspectionStatusLabel(value) }))
    : CAMPO_ISSUE_STATUS_VALUES.map((value) => ({ value, label: getProjectIssueStatusLabel(value) }));
}

function getQueueFieldStatusLabel(item: CampoQueueItem) {
  if (item.recordType === "VISTORIA") return item.inspectionStatus ? getProjectInspectionStatusLabel(item.inspectionStatus) : null;
  if (item.recordType === "OCORRENCIA") return item.issueStatus ? getProjectIssueStatusLabel(item.issueStatus) : null;
  return null;
}

function getAreaLabel(value: string | null | undefined) {
  return value &&
    isProjectDisciplineId(value) &&
    PRISMA_PROJECT_TECHNICAL_AREAS.includes(
      value as (typeof PRISMA_PROJECT_TECHNICAL_AREAS)[number]
    )
    ? getProjectTechnicalAreaLabel(value as (typeof PRISMA_PROJECT_TECHNICAL_AREAS)[number])
    : "N\u00e3o informado";
}

function getObjectLabel(value: string | null | undefined) {
  return value && isTechnicalObjectType(value) ? getTechnicalObjectLabel(value) : "N\u00e3o informado";
}

export default function CampoPage() {
  const [tab, setTab] = useState<ActiveTab>("capturar");
  const [recordType, setRecordType] = useState<RecordType>("VISTORIA");
  const [projectId, setProjectId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [technicalArea, setTechnicalArea] = useState<ProjectDisciplineId | "">("");
  const [technicalObjectType, setTechnicalObjectType] = useState<TechnicalObjectTypeId | "">("");
  const [relatedAssetId, setRelatedAssetId] = useState("");
  const [inspectionStatus, setInspectionStatus] = useState<CampoInspectionStatus>("REALIZADA");
  const [issueStatus, setIssueStatus] = useState<CampoIssueStatus>("ABERTA");
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
  const [projects, setProjects] = useState<CampoProjectOption[]>([]);
  const [projectAssets, setProjectAssets] = useState<CampoProjectAssetOption[]>([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [projectAssetsLoading, setProjectAssetsLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [queue, setQueue] = useState<CampoQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueSyncing, setQueueSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineSupported, setOfflineSupported] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);
  const selectedPhase = useMemo(() => selectedProject?.phases.find((phase) => phase.id === phaseId) ?? null, [phaseId, selectedProject]);
  const technicalAreaOptions = useMemo(() => (selectedProject ? getCampoTechnicalAreaOptions(selectedProject.technicalAreas) : []), [selectedProject]);
  const technicalObjectOptions = useMemo(
    () =>
      technicalArea
        ? getDisciplineObjectTypes(technicalArea).filter(
            (option): option is TechnicalObjectDefinition => Boolean(option)
          )
        : [],
    [technicalArea]
  );
  const filteredAssets = useMemo(() => {
    const allowedAreas = new Set<string>(technicalAreaOptions.map((option) => option.value));
    return projectAssets.filter((asset) => {
      if (asset.technicalArea && !allowedAreas.has(asset.technicalArea)) return false;
      if (technicalArea && asset.technicalArea !== technicalArea) return false;
      if (technicalObjectType && asset.technicalObjectType !== technicalObjectType) return false;
      return true;
    });
  }, [projectAssets, technicalArea, technicalAreaOptions, technicalObjectType]);
  const selectedRelatedAsset = useMemo(() => projectAssets.find((asset) => asset.id === relatedAssetId) ?? null, [projectAssets, relatedAssetId]);
  const fieldStatusOptions = useMemo(() => getFieldStatusOptions(recordType), [recordType]);

  const refreshQueue = useCallback(async () => {
    if (!isCampoOfflineSupported()) return void setQueue([]);
    setQueue(await listCampoQueueItems());
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

  const loadProjects = useCallback(async () => {
    setContextLoading(true);
    setContextError(null);
    try {
      const response = await fetch("/api/campo/context", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "N\u00e3o foi poss\u00edvel carregar o contexto de projetos.");
      const nextProjects = Array.isArray(payload?.data?.projects) ? payload.data.projects : [];
      setProjects(nextProjects);
      if (nextProjects.length === 1 && !projectId) setProjectId(nextProjects[0].id);
    } catch (error) {
      console.error("Falha ao carregar projetos de campo:", error);
      setContextError(error instanceof Error && error.message ? error.message : "Falha ao carregar os projetos dispon\u00edveis.");
    } finally {
      setContextLoading(false);
    }
  }, [projectId]);

  const loadProjectAssets = useCallback(async (nextProjectId: string) => {
    if (!nextProjectId) return void setProjectAssets([]);
    setProjectAssetsLoading(true);
    setContextError(null);
    try {
      const response = await fetch(`/api/campo/context?projectId=${encodeURIComponent(nextProjectId)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "N\u00e3o foi poss\u00edvel carregar os objetos t\u00e9cnicos do projeto.");
      setProjectAssets(Array.isArray(payload?.data?.assets) ? payload.data.assets : []);
    } catch (error) {
      console.error("Falha ao carregar objetos t\u00e9cnicos para campo:", error);
      setContextError(error instanceof Error && error.message ? error.message : "Falha ao carregar os objetos t\u00e9cnicos do projeto.");
      setProjectAssets([]);
    } finally {
      setProjectAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supported = isCampoOfflineSupported();
    setOfflineSupported(supported);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false);
    if (!supported) return void setQueueLoading(false);
    let intervalId: number | null = null;
    const onOnline = () => {
      setIsOnline(true);
      void runSync();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void refreshQueue().then(() => {
      if (navigator.onLine) void runSync();
    }).finally(() => setQueueLoading(false));
    intervalId = window.setInterval(() => {
      if (navigator.onLine) void runSync();
    }, 15_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [refreshQueue, runSync]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) return void setProjectAssets([]);
    void loadProjectAssets(projectId);
  }, [loadProjectAssets, projectId]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!selectedProject) {
      setPhaseId("");
      setTechnicalArea("");
      setTechnicalObjectType("");
      setRelatedAssetId("");
      return;
    }
    const allowedAreas = new Set<string>(technicalAreaOptions.map((option) => option.value));
    if (technicalArea && !allowedAreas.has(technicalArea)) {
      setTechnicalArea("");
      setTechnicalObjectType("");
      setRelatedAssetId("");
    }
    if (phaseId && !selectedProject.phases.some((phase) => phase.id === phaseId)) {
      setPhaseId("");
    }
  }, [phaseId, selectedProject, technicalArea, technicalAreaOptions]);

  useEffect(() => {
    if (technicalArea && !technicalObjectOptions.some((option) => option.id === technicalObjectType)) {
      setTechnicalObjectType("");
    }
  }, [technicalArea, technicalObjectOptions, technicalObjectType]);

  useEffect(() => {
    if (!selectedPhase?.technicalArea || !isProjectDisciplineId(selectedPhase.technicalArea)) return;
    if (technicalArea !== selectedPhase.technicalArea) setTechnicalArea(selectedPhase.technicalArea);
  }, [selectedPhase, technicalArea]);

  useEffect(() => {
    if (!selectedProject || technicalArea || technicalAreaOptions.length !== 1) return;
    setTechnicalArea(technicalAreaOptions[0].value);
  }, [selectedProject, technicalArea, technicalAreaOptions]);

  useEffect(() => {
    if (!selectedRelatedAsset) return;
    const assetArea =
      selectedRelatedAsset.technicalArea && isProjectDisciplineId(selectedRelatedAsset.technicalArea)
        ? selectedRelatedAsset.technicalArea
        : null;
    const assetAreaAllowed =
      assetArea && technicalAreaOptions.some((option) => option.value === assetArea);
    if (assetAreaAllowed && assetArea !== technicalArea) {
      setTechnicalArea(assetArea);
    }
    if (
      assetAreaAllowed &&
      selectedRelatedAsset.technicalObjectType &&
      selectedRelatedAsset.technicalObjectType !== technicalObjectType
    ) {
      setTechnicalObjectType(selectedRelatedAsset.technicalObjectType);
    }
  }, [selectedRelatedAsset, technicalArea, technicalAreaOptions, technicalObjectType]);

  const handleGetGps = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocaliza\u00e7\u00e3o indispon\u00edvel neste dispositivo.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsError("GPS indispon\u00edvel. Verifique as permiss\u00f5es do navegador.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const handlePhotoChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const availableSlots = Math.max(0, MAX_PHOTOS - photos.length);
    const acceptedFiles = files.slice(0, availableSlots);
    if (acceptedFiles.length === 0) return;
    setPhotos((current) => [...current, ...acceptedFiles]);
    setPreviews((current) => [...current, ...acceptedFiles.map((file) => URL.createObjectURL(file))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos.length]);

  const clearCaptureForm = useCallback(() => {
    setName("");
    setNote("");
    setCoords(null);
    setPhotos([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setRelatedAssetId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previews]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !projectId || !technicalArea || !technicalObjectType) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!isCampoOfflineSupported()) throw new Error("Seu navegador n\u00e3o suporta fila offline com IndexedDB.");
      await createCampoQueueItem({
        assetType: "PONTO",
        recordType,
        name: name.trim(),
        note: note.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        projectId,
        projectLabel: selectedProject ? buildCampoProjectLabel(selectedProject) : null,
        phaseId: phaseId || null,
        phaseLabel: selectedPhase ? buildCampoPhaseLabel(selectedPhase) : null,
        technicalArea,
        technicalObjectType,
        relatedAssetId: relatedAssetId || null,
        relatedAssetLabel: selectedRelatedAsset?.name ?? null,
        inspectionStatus: recordType === "VISTORIA" ? inspectionStatus : null,
        issueStatus: recordType === "OCORRENCIA" ? issueStatus : null,
        photos,
      });
      clearCaptureForm();
      await refreshQueue();
      if (typeof navigator !== "undefined" && navigator.onLine) await runSync();
      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar registro na fila offline:", error);
      setSubmitError(error instanceof Error && error.message ? error.message : "Falha ao salvar registro localmente.");
    } finally {
      setSubmitting(false);
    }
  }, [clearCaptureForm, coords?.lat, coords?.lng, inspectionStatus, issueStatus, name, note, phaseId, photos, projectId, recordType, refreshQueue, relatedAssetId, runSync, selectedPhase, selectedProject, selectedRelatedAsset, technicalArea, technicalObjectType]);

  const handleRetryItem = useCallback(async (id: string) => {
    await markCampoItemForRetry(id);
    await refreshQueue();
    if (typeof navigator !== "undefined" && navigator.onLine) await runSync();
  }, [refreshQueue, runSync]);

  const handleDeleteItem = useCallback(async (id: string) => {
    await removeCampoQueueItem(id);
    await refreshQueue();
  }, [refreshQueue]);

  const unsyncedCount = queue.filter((item) => item.status !== "synced").length;
  const errorCount = queue.filter((item) => item.status === "error" || item.status === "conflict").length;
  const canSubmit = Boolean(name.trim()) && Boolean(projectId) && Boolean(technicalArea) && Boolean(technicalObjectType);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-700 text-foreground">Campo e fiscaliza\u00e7\u00e3o</h1>
          <p className="text-sm text-muted-foreground">Captura offline-first com v\u00ednculo direto a projeto, etapa, \u00e1rea t\u00e9cnica e objeto relacionado.</p>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", isOnline ? "bg-accent-100 text-accent-700" : "bg-warning-100 text-warning-700")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-accent-500 animate-pulse-dot" : "bg-warning-500")} />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {!offlineSupported && <div className="rounded-xl border border-warning-300 bg-warning-50 px-4 py-3 text-xs text-warning-700">IndexedDB indispon\u00edvel neste navegador. O modo offline completo n\u00e3o pode ser habilitado.</div>}
      {contextError && <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{contextError}</div>}

      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {([ ["capturar", "Capturar registro"], ["fila", "Fila de envio"] ] as const).map(([currentTab, label]) => (
          <button key={currentTab} onClick={() => setTab(currentTab)} className={cn("relative flex-1 rounded-lg py-2 text-sm font-medium transition-all", tab === currentTab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
            {currentTab === "fila" && unsyncedCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning-500 text-[9px] font-700 text-white">{unsyncedCount}</span>}
          </button>
        ))}
      </div>

      {tab === "capturar" ? (
        <div className="space-y-4">
          {submitted && <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700">Registro salvo localmente na fila. {isOnline ? "Sincroniza\u00e7\u00e3o disparada." : "Sincroniza quando a conex\u00e3o voltar."}</div>}
          {submitError && <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">{submitError}</div>}
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo de registro</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {RECORD_TYPES.map((option) => (
                    <button key={option.value} onClick={() => setRecordType(option.value)} className={cn("rounded-lg border p-3 text-left transition-all", recordType === option.value ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-border hover:border-muted-foreground/40")}>
                      <p className={cn("text-sm font-medium", recordType === option.value ? "text-brand-700 dark:text-brand-300" : "text-foreground")}>{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Projeto *</label>
                    <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setPhaseId(""); setTechnicalArea(""); setTechnicalObjectType(""); setRelatedAssetId(""); }} disabled={contextLoading} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30">
                      <option value="">Selecione o projeto</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{buildCampoProjectLabel(project)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Etapa</label>
                    <select value={phaseId} onChange={(event) => setPhaseId(event.target.value)} disabled={!selectedProject} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 disabled:cursor-not-allowed disabled:bg-muted">
                      <option value="">Sem etapa vinculada</option>
                      {selectedProject?.phases.map((phase) => <option key={phase.id} value={phase.id}>{buildCampoPhaseLabel(phase)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">\u00c1rea t\u00e9cnica *</label>
                    <select value={technicalArea} onChange={(event) => { const nextValue = event.target.value; setTechnicalArea(nextValue && isProjectDisciplineId(nextValue) ? nextValue : ""); setTechnicalObjectType(""); setRelatedAssetId(""); }} disabled={!selectedProject} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 disabled:cursor-not-allowed disabled:bg-muted">
                      <option value="">Selecione a \u00e1rea</option>
                      {technicalAreaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {selectedProject && technicalAreaOptions.length === 0 && <p className="mt-1 text-xs text-warning-700">Este projeto ainda n\u00e3o possui \u00e1reas t\u00e9cnicas vinculadas.</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Objeto t\u00e9cnico *</label>
                    <select value={technicalObjectType} onChange={(event) => { const nextValue = event.target.value; setTechnicalObjectType(nextValue && isTechnicalObjectType(nextValue) ? nextValue : ""); setRelatedAssetId(""); }} disabled={!technicalArea} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 disabled:cursor-not-allowed disabled:bg-muted">
                      <option value="">Selecione o objeto t\u00e9cnico</option>
                      {technicalObjectOptions.map((objectType) => <option key={objectType.id} value={objectType.id}>{objectType.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Objeto relacionado</label>
                    <select value={relatedAssetId} onChange={(event) => setRelatedAssetId(event.target.value)} disabled={!projectId || projectAssetsLoading} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 disabled:cursor-not-allowed disabled:bg-muted">
                      <option value="">Sem v\u00ednculo direto</option>
                      {filteredAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} \u00b7 {getCampoTechnicalObjectLabel(asset.technicalObjectType)}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">{projectAssetsLoading ? "Carregando objetos t\u00e9cnicos do projeto..." : "Opcional. Use quando a vistoria ou ocorr\u00eancia apontar para um item t\u00e9cnico j\u00e1 cadastrado."}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Status de fiscaliza\u00e7\u00e3o *</label>
                    <select value={recordType === "VISTORIA" ? inspectionStatus : issueStatus} onChange={(event) => { if (recordType === "VISTORIA") setInspectionStatus(event.target.value as CampoInspectionStatus); else setIssueStatus(event.target.value as CampoIssueStatus); }} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30">
                      {fieldStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{recordType === "VISTORIA" ? "T\u00edtulo da vistoria *" : "T\u00edtulo da ocorr\u00eancia *"}</label>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={recordType === "VISTORIA" ? "Ex: Vistoria de drenagem no trecho da Rua Jo\u00e3o Pessoa" : "Ex: Ocorr\u00eancia de ponto apagado em lumin\u00e1ria da pra\u00e7a"} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Observa\u00e7\u00f5es de campo</label>
                  <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Achados, condi\u00e7\u00e3o encontrada, risco observado, encaminhamento ou recomenda\u00e7\u00e3o t\u00e9cnica..." className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
                <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Projeto</p><p className="mt-1 font-medium text-foreground">{selectedProject ? buildCampoProjectLabel(selectedProject) : "Selecione um projeto"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">\u00c1rea t\u00e9cnica</p><p className="mt-1 font-medium text-foreground">{getAreaLabel(technicalArea)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Objeto t\u00e9cnico</p><p className="mt-1 font-medium text-foreground">{getObjectLabel(technicalObjectType)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Etapa</p><p className="mt-1 font-medium text-foreground">{selectedPhase ? buildCampoPhaseLabel(selectedPhase) : "Sem etapa vinculada"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Objeto relacionado</p><p className="mt-1 font-medium text-foreground">{selectedRelatedAsset ? `${selectedRelatedAsset.name} \u00b7 ${getCampoTechnicalObjectLabel(selectedRelatedAsset.technicalObjectType)}` : "Sem v\u00ednculo direto"}</p></div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Localiza\u00e7\u00e3o GPS</p>
                {coords ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100"><svg className="h-4 w-4 text-accent-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg></div>
                      <p className="geo-label text-xs">{formatCoords(coords.lat, coords.lng)}</p>
                    </div>
                    <button onClick={() => setCoords(null)} className="text-xs text-muted-foreground transition-colors hover:text-danger-600">Remover</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button onClick={handleGetGps} disabled={gpsLoading} className={cn("flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-medium transition-all", gpsLoading ? "cursor-wait border-brand-300 text-brand-500" : "border-border text-muted-foreground hover:border-brand-400 hover:text-brand-600")}>{gpsLoading ? "Obtendo localiza\u00e7\u00e3o..." : "Capturar GPS atual"}</button>
                    {gpsError && <p className="text-xs text-danger-600">{gpsError}</p>}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fotos ({previews.length}/{MAX_PHOTOS})</p>
                  {previews.length < MAX_PHOTOS && <button onClick={() => fileInputRef.current?.click()} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50">Adicionar</button>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoChange} />
                {previews.length === 0 ? <button onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-all hover:border-brand-400 hover:text-brand-600"><span className="text-sm">Tirar foto ou escolher da galeria</span></button> : <div className="grid grid-cols-3 gap-2">{previews.map((src, index) => <div key={src} className="group relative aspect-square overflow-hidden rounded-lg">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" /><button onClick={() => removePhoto(index)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">x</button></div>)}</div>}
              </div>

              <button onClick={() => void handleSubmit()} disabled={!canSubmit || submitting} className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all", !canSubmit || submitting ? "cursor-not-allowed bg-slate-300" : "bg-brand-600 hover:bg-brand-700")}>{submitting ? "Salvando na fila..." : "Salvar registro na fila offline"}</button>
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{queueLoading ? "Carregando fila..." : `${queue.length} item(ns) na fila`}</p>
              <p className="text-xs text-muted-foreground">{errorCount > 0 ? `${errorCount} item(ns) com falha precisam de aten\u00e7\u00e3o.` : "A fila sincroniza automaticamente quando a conex\u00e3o voltar."}</p>
            </div>
            <button onClick={() => void runSync()} disabled={!isOnline || queueSyncing || queueLoading || unsyncedCount === 0} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-all", !isOnline || queueSyncing || queueLoading || unsyncedCount === 0 ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-brand-600 text-white hover:bg-brand-700")}>{queueSyncing ? "Sincronizando..." : "Sincronizar agora"}</button>
          </div>

          {queue.length === 0 && !queueLoading ? <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center"><p className="text-sm font-medium text-foreground">Nenhum registro na fila.</p><p className="mt-1 text-sm text-muted-foreground">Capture uma vistoria ou ocorr\u00eancia para come\u00e7ar.</p></div> : queue.map((item) => {
            const syncState = SYNC_CONFIG[item.status];
            const attachmentTotal = item.attachmentCount || item.uploadedPhotoUrls.length;
            const contextLine = [item.phaseLabel, item.technicalArea ? getAreaLabel(item.technicalArea) : null, item.technicalObjectType ? getObjectLabel(item.technicalObjectType) : null].filter(Boolean).join(" \u00b7 ");
            const fieldStatusLabel = getQueueFieldStatusLabel(item);
            return (
              <div key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="status-badge bg-slate-100 text-slate-600 text-[9px]">{item.recordType === "VISTORIA" ? "Vistoria" : item.recordType === "OCORRENCIA" ? "Ocorr\u00eancia" : item.assetType}</span>
                      {fieldStatusLabel && <span className="status-badge bg-brand-50 text-brand-700 text-[9px]">{fieldStatusLabel}</span>}
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    </div>
                    {item.projectLabel && <p className="text-xs font-medium text-foreground">{item.projectLabel}</p>}
                    {contextLine && <p className="mt-1 text-xs text-muted-foreground">{contextLine}</p>}
                    {item.relatedAssetLabel && <p className="mt-1 text-xs text-muted-foreground">Relacionado a {item.relatedAssetLabel}</p>}
                    {item.note && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.note}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">{typeof item.lat === "number" && typeof item.lng === "number" && <span className="geo-label">{formatCoords(item.lat, item.lng)}</span>}<span>{formatDateTime(item.createdAt)}</span>{attachmentTotal > 0 && <span>{attachmentTotal} foto(s)</span>}</div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{syncState.description}</p>
                    {item.status === "error" && item.nextRetryAt && <p className="mt-1 text-[11px] text-warning-600">Pr\u00f3xima tentativa autom\u00e1tica: {formatDateTime(item.nextRetryAt)}</p>}
                    {item.lastError && (item.status === "error" || item.status === "conflict") && <p className="mt-1 text-[11px] text-danger-600">Detalhe: {item.lastError}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className={cn("flex items-center gap-1 text-xs font-medium", syncState.color)}>{syncState.label}</div>
                    {(item.status === "error" || item.status === "conflict") && <button onClick={() => void handleRetryItem(item.id)} className="rounded-md bg-warning-500 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-warning-600">Tentar novamente</button>}
                    {(item.status === "synced" || item.status === "conflict") && <button onClick={() => void handleDeleteItem(item.id)} className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground">Remover da fila</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
