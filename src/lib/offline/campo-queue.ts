import type { CampoChecklistEntry } from "@/lib/campo-checklists";
import type { ProjectPriorityValue } from "@/lib/project-portfolio";

export type CampoAssetType = "PONTO" | "TRECHO" | "AREA";
export type CampoRecordType = "VISTORIA" | "OCORRENCIA";
export type CampoInspectionStatus = "AGENDADA" | "REALIZADA" | "CANCELADA";
export type CampoIssueStatus =
  | "ABERTA"
  | "EM_TRATATIVA"
  | "RESOLVIDA"
  | "FECHADA"
  | "CANCELADA";
export type CampoSyncStatus = "pending" | "syncing" | "synced" | "error" | "conflict";

export interface CampoQueueItem {
  id: string;
  assetType: CampoAssetType;
  recordType: CampoRecordType | null;
  name: string;
  note: string;
  lat: number | null;
  lng: number | null;
  projectId: string | null;
  projectLabel: string | null;
  phaseId: string | null;
  phaseLabel: string | null;
  technicalArea: string | null;
  technicalObjectType: string | null;
  relatedAssetId: string | null;
  relatedAssetLabel: string | null;
  inspectionStatus: CampoInspectionStatus | null;
  issueStatus: CampoIssueStatus | null;
  checklistEntries: CampoChecklistEntry[];
  openIssueFromInspection: boolean;
  inspectionIssueTitle: string | null;
  inspectionIssueStatus: CampoIssueStatus | null;
  inspectionIssuePriority: ProjectPriorityValue | null;
  createdAt: string;
  updatedAt: string;
  status: CampoSyncStatus;
  retryCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  attachmentCount: number;
  uploadedPhotoUrls: string[];
  serverAssetId: string | null;
  syncedAt: string | null;
}

export interface CampoCaptureDraft {
  assetType: CampoAssetType;
  recordType?: CampoRecordType | null;
  name: string;
  note: string;
  lat: number | null;
  lng: number | null;
  projectId?: string | null;
  projectLabel?: string | null;
  phaseId?: string | null;
  phaseLabel?: string | null;
  technicalArea?: string | null;
  technicalObjectType?: string | null;
  relatedAssetId?: string | null;
  relatedAssetLabel?: string | null;
  inspectionStatus?: CampoInspectionStatus | null;
  issueStatus?: CampoIssueStatus | null;
  checklistEntries?: CampoChecklistEntry[];
  openIssueFromInspection?: boolean;
  inspectionIssueTitle?: string | null;
  inspectionIssueStatus?: CampoIssueStatus | null;
  inspectionIssuePriority?: ProjectPriorityValue | null;
  photos: File[];
  createdAt?: string;
}

export interface CampoSyncSummary {
  processed: number;
  synced: number;
  failed: number;
  conflicted: number;
  skipped: number;
}

interface CampoQueueRecord {
  id: string;
  assetType: CampoAssetType;
  recordType: CampoRecordType | null;
  name: string;
  note: string;
  lat: number | null;
  lng: number | null;
  projectId: string | null;
  projectLabel: string | null;
  phaseId: string | null;
  phaseLabel: string | null;
  technicalArea: string | null;
  technicalObjectType: string | null;
  relatedAssetId: string | null;
  relatedAssetLabel: string | null;
  inspectionStatus: CampoInspectionStatus | null;
  issueStatus: CampoIssueStatus | null;
  checklistEntries: CampoChecklistEntry[];
  openIssueFromInspection: boolean;
  inspectionIssueTitle: string | null;
  inspectionIssueStatus: CampoIssueStatus | null;
  inspectionIssuePriority: ProjectPriorityValue | null;
  createdAt: string;
  updatedAt: string;
  status: CampoSyncStatus;
  retryCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  uploadedPhotoUrls: string[];
  serverAssetId: string | null;
  syncedAt: string | null;
}

interface CampoAttachmentRecord {
  id: string;
  queueId: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

const DB_NAME = "urbandesk-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "campo_queue";
const ATTACHMENT_STORE = "campo_attachments";
const ATTACHMENT_QUEUE_INDEX = "by_queue";

const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 10 * 60 * 1_000;

let activeSyncPromise: Promise<CampoSyncSummary> | null = null;

function ensureOfflineSupport(): void {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("IndexedDB indisponível neste ambiente.");
  }
}

export function isCampoOfflineSupported(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${prefix}-${hex}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeChecklistEntries(
  value: CampoChecklistEntry[] | null | undefined
): CampoChecklistEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is CampoChecklistEntry =>
      Boolean(
        entry &&
          typeof entry.itemId === "string" &&
          entry.itemId.trim().length > 0 &&
          typeof entry.status === "string"
      )
  );
}

function toQueueItem(record: CampoQueueRecord, attachmentCount: number): CampoQueueItem {
  return {
    ...record,
    checklistEntries: normalizeChecklistEntries(record.checklistEntries),
    openIssueFromInspection: Boolean(record.openIssueFromInspection),
    inspectionIssueTitle: normalizeText(record.inspectionIssueTitle),
    inspectionIssueStatus: record.inspectionIssueStatus ?? null,
    inspectionIssuePriority: record.inspectionIssuePriority ?? null,
    attachmentCount,
  };
}

function computeNextRetryAt(retryCount: number): string {
  const exponent = Math.max(0, retryCount - 1);
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** exponent);
  return new Date(Date.now() + delay).toISOString();
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Erro no IndexedDB."));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Falha na transação IndexedDB."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transação IndexedDB abortada."));
  });
}

async function openDb(): Promise<IDBDatabase> {
  ensureOfflineSupport();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
        const attachmentStore = db.createObjectStore(ATTACHMENT_STORE, { keyPath: "id" });
        attachmentStore.createIndex(ATTACHMENT_QUEUE_INDEX, "queueId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir IndexedDB."));
  });
}

async function readQueueSnapshot(): Promise<{
  records: CampoQueueRecord[];
  attachments: CampoAttachmentRecord[];
}> {
  const db = await openDb();

  try {
    const transaction = db.transaction([QUEUE_STORE, ATTACHMENT_STORE], "readonly");
    const queueStore = transaction.objectStore(QUEUE_STORE);
    const attachmentStore = transaction.objectStore(ATTACHMENT_STORE);

    const recordsPromise = requestToPromise(queueStore.getAll() as IDBRequest<CampoQueueRecord[]>);
    const attachmentsPromise = requestToPromise(
      attachmentStore.getAll() as IDBRequest<CampoAttachmentRecord[]>
    );

    const [records, attachments] = await Promise.all([
      recordsPromise,
      attachmentsPromise,
      transactionToPromise(transaction),
    ]);

    return { records, attachments };
  } finally {
    db.close();
  }
}

async function getQueueRecordById(id: string): Promise<CampoQueueRecord | null> {
  const db = await openDb();

  try {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const queueStore = transaction.objectStore(QUEUE_STORE);
    const record = await requestToPromise(
      queueStore.get(id) as IDBRequest<CampoQueueRecord | undefined>
    );
    await transactionToPromise(transaction);

    return record ?? null;
  } finally {
    db.close();
  }
}

async function getAttachmentsByQueueId(queueId: string): Promise<CampoAttachmentRecord[]> {
  const db = await openDb();

  try {
    const transaction = db.transaction(ATTACHMENT_STORE, "readonly");
    const store = transaction.objectStore(ATTACHMENT_STORE);
    const index = store.index(ATTACHMENT_QUEUE_INDEX);
    const attachments = await requestToPromise(
      index.getAll(queueId) as IDBRequest<CampoAttachmentRecord[]>
    );
    await transactionToPromise(transaction);
    return attachments;
  } finally {
    db.close();
  }
}

async function updateQueueRecord(
  id: string,
  updater: (current: CampoQueueRecord) => CampoQueueRecord
): Promise<CampoQueueRecord | null> {
  const db = await openDb();

  try {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const queueStore = transaction.objectStore(QUEUE_STORE);

    const current = await requestToPromise(
      queueStore.get(id) as IDBRequest<CampoQueueRecord | undefined>
    );

    if (!current) {
      await transactionToPromise(transaction);
      return null;
    }

    const next = updater(current);
    await requestToPromise(queueStore.put(next));
    await transactionToPromise(transaction);
    return next;
  } finally {
    db.close();
  }
}

async function removeAttachmentsByQueueId(queueId: string): Promise<void> {
  const db = await openDb();

  try {
    const transaction = db.transaction(ATTACHMENT_STORE, "readwrite");
    const store = transaction.objectStore(ATTACHMENT_STORE);
    const index = store.index(ATTACHMENT_QUEUE_INDEX);
    const keys = await requestToPromise(index.getAllKeys(queueId));

    for (const key of keys) {
      await requestToPromise(store.delete(key));
    }

    await transactionToPromise(transaction);
  } finally {
    db.close();
  }
}

function isRetryDue(item: CampoQueueRecord, nowMs: number): boolean {
  if (!item.nextRetryAt) return true;
  const retryMs = new Date(item.nextRetryAt).getTime();
  if (!Number.isFinite(retryMs)) return true;
  return retryMs <= nowMs;
}

function buildGeomWkt(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return null;
  return `POINT(${lng} ${lat})`;
}

function buildCampoAssetPayload(item: CampoQueueRecord, photoUrls: string[]) {
  return {
    name: item.name,
    type: item.assetType,
    description: item.note || null,
    photos: photoUrls,
    geomWkt: buildGeomWkt(item.lat, item.lng),
    attributes: {
      source: "campo",
      clientRef: item.id,
      note: item.note,
      lat: item.lat,
      lng: item.lng,
      photos: photoUrls,
      capturedAt: item.createdAt,
      offlineQueue: true,
    },
  };
}

function buildCampoFieldRecordPayload(item: CampoQueueRecord, photoUrls: string[]) {
  return {
    recordType: item.recordType,
    name: item.name,
    note: item.note || null,
    lat: item.lat,
    lng: item.lng,
    photos: photoUrls,
    projectId: item.projectId,
    phaseId: item.phaseId,
    technicalArea: item.technicalArea,
    technicalObjectType: item.technicalObjectType,
    relatedAssetId: item.relatedAssetId,
    inspectionStatus: item.inspectionStatus,
    issueStatus: item.issueStatus,
    checklistEntries: normalizeChecklistEntries(item.checklistEntries),
    openIssueFromInspection: item.openIssueFromInspection,
    inspectionIssueTitle: item.inspectionIssueTitle,
    inspectionIssueStatus: item.inspectionIssueStatus,
    inspectionIssuePriority: item.inspectionIssuePriority,
    clientRef: item.id,
  };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim().length > 0) {
      return maybeError;
    }
  }
  return fallback;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function uploadAttachments(
  attachments: CampoAttachmentRecord[],
  fetchImpl: typeof fetch
): Promise<string[]> {
  if (attachments.length === 0) return [];

  const formData = new FormData();
  formData.append("module", "campo");

  for (const attachment of attachments) {
    formData.append("files", attachment.blob, attachment.name);
  }

  const response = await fetchImpl("/api/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Falha ao enviar anexos."));
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Resposta inválida do upload.");
  }

  const urls = (payload as { urls?: unknown }).urls;
  if (!Array.isArray(urls)) {
    throw new Error("Upload retornou payload sem URLs.");
  }

  const validUrls = urls.filter((url): url is string => typeof url === "string" && url.length > 0);
  if (validUrls.length === 0) {
    throw new Error("Upload não retornou URLs válidas.");
  }

  return validUrls;
}

export async function createCampoQueueItem(draft: CampoCaptureDraft): Promise<CampoQueueItem> {
  const db = await openDb();

  try {
    const transaction = db.transaction([QUEUE_STORE, ATTACHMENT_STORE], "readwrite");
    const queueStore = transaction.objectStore(QUEUE_STORE);
    const attachmentStore = transaction.objectStore(ATTACHMENT_STORE);

    const now = new Date().toISOString();
    const itemId = createId("campo");

    const record: CampoQueueRecord = {
      id: itemId,
      assetType: draft.assetType,
      recordType: draft.recordType ?? null,
      name: draft.name.trim(),
      note: draft.note.trim(),
      lat: normalizeNumber(draft.lat),
      lng: normalizeNumber(draft.lng),
      projectId: normalizeText(draft.projectId),
      projectLabel: normalizeText(draft.projectLabel),
      phaseId: normalizeText(draft.phaseId),
      phaseLabel: normalizeText(draft.phaseLabel),
      technicalArea: normalizeText(draft.technicalArea),
      technicalObjectType: normalizeText(draft.technicalObjectType),
      relatedAssetId: normalizeText(draft.relatedAssetId),
      relatedAssetLabel: normalizeText(draft.relatedAssetLabel),
      inspectionStatus: draft.inspectionStatus ?? null,
      issueStatus: draft.issueStatus ?? null,
      checklistEntries: normalizeChecklistEntries(draft.checklistEntries),
      openIssueFromInspection: Boolean(draft.openIssueFromInspection),
      inspectionIssueTitle: normalizeText(draft.inspectionIssueTitle),
      inspectionIssueStatus: draft.inspectionIssueStatus ?? null,
      inspectionIssuePriority: draft.inspectionIssuePriority ?? null,
      createdAt: draft.createdAt ?? now,
      updatedAt: now,
      status: "pending",
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      uploadedPhotoUrls: [],
      serverAssetId: null,
      syncedAt: null,
    };

    await requestToPromise(queueStore.put(record));

    for (const file of draft.photos) {
      const attachment: CampoAttachmentRecord = {
        id: createId("att"),
        queueId: itemId,
        name: file.name || `${createId("photo")}.jpg`,
        type: file.type || "application/octet-stream",
        size: file.size,
        blob: file,
        createdAt: now,
      };

      await requestToPromise(attachmentStore.put(attachment));
    }

    await transactionToPromise(transaction);

    return toQueueItem(record, draft.photos.length);
  } finally {
    db.close();
  }
}

export async function listCampoQueueItems(): Promise<CampoQueueItem[]> {
  const { records, attachments } = await readQueueSnapshot();
  const attachmentCountByQueueId = new Map<string, number>();

  for (const attachment of attachments) {
    attachmentCountByQueueId.set(
      attachment.queueId,
      (attachmentCountByQueueId.get(attachment.queueId) ?? 0) + 1
    );
  }

  return records
    .map((record) => toQueueItem(record, attachmentCountByQueueId.get(record.id) ?? 0))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function removeCampoQueueItem(id: string): Promise<void> {
  const db = await openDb();

  try {
    const transaction = db.transaction([QUEUE_STORE, ATTACHMENT_STORE], "readwrite");
    const queueStore = transaction.objectStore(QUEUE_STORE);
    const attachmentStore = transaction.objectStore(ATTACHMENT_STORE);
    const attachmentIndex = attachmentStore.index(ATTACHMENT_QUEUE_INDEX);

    const attachmentKeys = await requestToPromise(attachmentIndex.getAllKeys(id));
    for (const key of attachmentKeys) {
      await requestToPromise(attachmentStore.delete(key));
    }

    await requestToPromise(queueStore.delete(id));
    await transactionToPromise(transaction);
  } finally {
    db.close();
  }
}

export async function markCampoItemForRetry(id: string): Promise<void> {
  await updateQueueRecord(id, (current) => ({
    ...current,
    status: "pending",
    retryCount: 0,
    nextRetryAt: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  }));
}

async function setItemStatusSyncing(id: string): Promise<void> {
  await updateQueueRecord(id, (current) => ({
    ...current,
    status: "syncing",
    lastError: null,
    updatedAt: new Date().toISOString(),
  }));
}

async function setItemStatusSynced(
  id: string,
  serverAssetId: string | null,
  photoUrls: string[]
): Promise<void> {
  await updateQueueRecord(id, (current) => ({
    ...current,
    status: "synced",
    serverAssetId,
    syncedAt: new Date().toISOString(),
    uploadedPhotoUrls: photoUrls,
    nextRetryAt: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  }));
}

async function setItemStatusError(id: string, reason: string): Promise<void> {
  await updateQueueRecord(id, (current) => {
    const nextRetryCount = current.retryCount + 1;
    return {
      ...current,
      status: "error",
      retryCount: nextRetryCount,
      nextRetryAt: computeNextRetryAt(nextRetryCount),
      lastError: reason,
      updatedAt: new Date().toISOString(),
    };
  });
}

async function setItemStatusConflict(id: string, reason: string): Promise<void> {
  await updateQueueRecord(id, (current) => ({
    ...current,
    status: "conflict",
    lastError: reason,
    nextRetryAt: null,
    updatedAt: new Date().toISOString(),
  }));
}

async function saveUploadedPhotoUrls(id: string, photoUrls: string[]): Promise<void> {
  await updateQueueRecord(id, (current) => ({
    ...current,
    uploadedPhotoUrls: photoUrls,
    updatedAt: new Date().toISOString(),
  }));
}

async function runSync(fetchImpl: typeof fetch): Promise<CampoSyncSummary> {
  const summary: CampoSyncSummary = {
    processed: 0,
    synced: 0,
    failed: 0,
    conflicted: 0,
    skipped: 0,
  };

  const { records } = await readQueueSnapshot();
  const nowMs = Date.now();

  const candidates = records
    .filter((item) => {
      if (item.status === "synced" || item.status === "conflict") return false;
      return isRetryDue(item, nowMs);
    })
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  for (const candidate of candidates) {
    summary.processed += 1;

    await setItemStatusSyncing(candidate.id);

    const current = await getQueueRecordById(candidate.id);
    if (!current) {
      summary.skipped += 1;
      continue;
    }

    try {
      const attachments = await getAttachmentsByQueueId(current.id);

      let photoUrls = current.uploadedPhotoUrls;
      if (attachments.length > 0 && photoUrls.length < attachments.length) {
        photoUrls = await uploadAttachments(attachments, fetchImpl);
        await saveUploadedPhotoUrls(current.id, photoUrls);
      }

      const isFieldRecord = current.recordType === "VISTORIA" || current.recordType === "OCORRENCIA";
      const payload = isFieldRecord
        ? buildCampoFieldRecordPayload(current, photoUrls)
        : buildCampoAssetPayload(current, photoUrls);

      const response = await fetchImpl(isFieldRecord ? "/api/campo/records" : "/api/gis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-offline-client-ref": current.id,
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await safeJson(response);

      if (response.status === 409) {
        await setItemStatusConflict(
          current.id,
          extractErrorMessage(responsePayload, "Conflito de sincronização detectado.")
        );
        summary.conflicted += 1;
        continue;
      }

      if (!response.ok) {
        throw new Error(extractErrorMessage(responsePayload, "Falha ao sincronizar registro de campo."));
      }

      const serverAssetId =
        responsePayload &&
        typeof responsePayload === "object" &&
        typeof (responsePayload as { data?: { id?: unknown } }).data?.id === "string"
          ? (responsePayload as { data: { id: string } }).data.id
          : null;

      await setItemStatusSynced(current.id, serverAssetId, photoUrls);
      await removeAttachmentsByQueueId(current.id);
      summary.synced += 1;
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Erro inesperado na sincronização.";
      await setItemStatusError(current.id, message);
      summary.failed += 1;
    }
  }

  return summary;
}

export async function syncCampoQueueNow(fetchImpl: typeof fetch = fetch): Promise<CampoSyncSummary> {
  if (!isCampoOfflineSupported()) {
    return {
      processed: 0,
      synced: 0,
      failed: 0,
      conflicted: 0,
      skipped: 0,
    };
  }

  if (!activeSyncPromise) {
    activeSyncPromise = runSync(fetchImpl).finally(() => {
      activeSyncPromise = null;
    });
  }

  return activeSyncPromise;
}

export async function getCampoQueueItem(id: string): Promise<CampoQueueItem | null> {
  const record = await getQueueRecordById(id);
  if (!record) return null;
  const attachments = await getAttachmentsByQueueId(id);
  return toQueueItem(record, attachments.length);
}

