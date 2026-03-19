"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ProjectTechnicalArea } from "@prisma/client";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import {
  PROJECT_DOCUMENT_TYPE_VALUES,
  type ProjectDocumentIndicators,
  type SerializedProjectDocument,
} from "@/lib/project-documents";
import {
  getProjectDocumentTypeLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import { formatDate, formatDateTime } from "@/lib/utils";

type DocumentCompatibility = {
  documentSchemaReady: boolean;
  measurementSchemaReady: boolean;
  notice: string | null;
};

type ProjectDocumentsClientProps = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  initialDocuments: SerializedProjectDocument[];
  initialIndicators: ProjectDocumentIndicators;
  technicalAreas: ProjectTechnicalArea[];
  canManageDocuments: boolean;
  compatibility: DocumentCompatibility;
};

type UploadFormState = {
  title: string;
  description: string;
  documentType: (typeof PROJECT_DOCUMENT_TYPE_VALUES)[number];
  documentDate: string;
  technicalArea: "" | ProjectTechnicalArea;
  isPublic: boolean;
};

const EMPTY_FORM: UploadFormState = {
  title: "",
  description: "",
  documentType: "CONTRATO",
  documentDate: "",
  technicalArea: "",
  isPublic: false,
};

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLatestDate(value: string | null) {
  return value ? formatDate(value) : "Sem data";
}

export function ProjectDocumentsClient({
  projectId,
  projectCode,
  projectName,
  initialDocuments,
  initialIndicators,
  technicalAreas,
  canManageDocuments,
  compatibility,
}: ProjectDocumentsClientProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [form, setForm] = useState<UploadFormState>(EMPTY_FORM);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<
    "" | (typeof PROJECT_DOCUMENT_TYPE_VALUES)[number]
  >("");
  const [technicalAreaFilter, setTechnicalAreaFilter] = useState<"" | ProjectTechnicalArea>("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"date_desc" | "date_asc">("date_desc");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = documents.filter((document) => {
      if (categoryFilter && document.documentType !== categoryFilter) return false;
      if (technicalAreaFilter && document.technicalArea !== technicalAreaFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        document.title,
        document.description,
        document.fileName,
        getProjectDocumentTypeLabel(document.documentType),
        document.technicalArea ? getProjectTechnicalAreaLabel(document.technicalArea) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    next.sort((left, right) => {
      const leftValue = left.documentDate ?? left.createdAt;
      const rightValue = right.documentDate ?? right.createdAt;
      return sortOrder === "date_desc"
        ? rightValue.localeCompare(leftValue)
        : leftValue.localeCompare(rightValue);
    });

    return next;
  }, [categoryFilter, documents, search, sortOrder, technicalAreaFilter]);

  const categoryBreakdown = useMemo(
    () =>
      indicators.byCategory
        .slice()
        .sort((left, right) => right.count - left.count)
        .slice(0, 6),
    [indicators.byCategory]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPendingFiles([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSubmitError(null);
    setFeedback(null);

    try {
      if (pendingFiles.length === 0) {
        throw new Error("Selecione ao menos um arquivo para envio.");
      }

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("documentType", form.documentType);
      formData.append("documentDate", form.documentDate);
      formData.append("technicalArea", form.technicalArea);
      formData.append("isPublic", String(form.isPublic));

      for (const file of pendingFiles) {
        formData.append("files", file);
      }

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao enviar documentos.");
      }

      setDocuments(Array.isArray(payload?.data) ? payload.data : []);
      if (payload?.indicators) setIndicators(payload.indicators);
      resetForm();
      setFeedback(
        typeof payload?.message === "string"
          ? payload.message
          : "Documento(s) enviado(s) com sucesso."
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Falha ao enviar documentos."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!compatibility.documentSchemaReady && compatibility.notice ? (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          {compatibility.notice}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Documentos"
          value={String(indicators.totalDocuments)}
          helper="Acervo documental vinculado ao projeto."
        />
        <ProjectMetricCard
          label="Categorias"
          value={String(indicators.categorizedDocuments)}
          helper="Categorias documentais já utilizadas."
        />
        <ProjectMetricCard
          label="Com área técnica"
          value={String(indicators.areaLinkedDocuments)}
          helper="Itens vinculados a uma disciplina específica."
        />
        <ProjectMetricCard
          label="Último documento"
          value={formatLatestDate(indicators.latestDocumentDate)}
          helper="Data mais recente registrada no acervo."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
        <ProjectSectionCard
          eyebrow="Documentos"
          title="Acervo do projeto"
          description={`Organize contratos, peças técnicas, medições e registros institucionais de ${projectCode ?? projectName}.`}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Categoria</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    (event.target.value || "") as "" | (typeof PROJECT_DOCUMENT_TYPE_VALUES)[number]
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
              >
                <option value="">Todas</option>
                {PROJECT_DOCUMENT_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {getProjectDocumentTypeLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Área técnica</span>
              <select
                value={technicalAreaFilter}
                onChange={(event) =>
                  setTechnicalAreaFilter(
                    (event.target.value || "") as "" | ProjectTechnicalArea
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
              >
                <option value="">Todas</option>
                {technicalAreas.map((area) => (
                  <option key={area} value={area}>
                    {getProjectTechnicalAreaLabel(area)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Busca</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Título, arquivo ou categoria..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Ordenação</span>
              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as "date_desc" | "date_asc")
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
              >
                <option value="date_desc">Data mais recente</option>
                <option value="date_asc">Data mais antiga</option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            {filteredDocuments.length === 0 ? (
              <ProjectEmptyBlock
                title="Nenhum documento encontrado"
                description="Ajuste os filtros ou envie novos arquivos para começar o acervo documental."
              />
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((document) => (
                  <article
                    key={document.id}
                    className="rounded-xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {document.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getProjectDocumentTypeLabel(document.documentType)} · {document.fileName}
                        </p>
                        {document.description ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {document.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ProjectBadge
                          label={document.isPublic ? "Público" : "Interno"}
                          tone={document.isPublic ? "success" : "neutral"}
                        />
                        {document.technicalArea ? (
                          <ProjectBadge
                            label={getProjectTechnicalAreaLabel(document.technicalArea)}
                            tone="brand"
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Data do documento
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {document.documentDate ? formatDate(document.documentDate) : "Não informada"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Upload
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {document.uploadedBy?.name || "Não informado"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(document.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Tipo / tamanho
                        </p>
                        <p className="mt-1 font-medium text-foreground">
                          {document.mimeType || "Tipo não informado"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(document.fileSize)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Vínculos
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {document.phase ? (
                            <ProjectBadge
                              label={`Fase ${document.phase.sequence}`}
                              tone="neutral"
                            />
                          ) : null}
                          {document.contract ? (
                            <ProjectBadge label="Contrato" tone="warning" />
                          ) : null}
                          {document.measurement ? (
                            <ProjectBadge
                              label={`Medição #${document.measurement.measurementNumber}`}
                              tone="success"
                            />
                          ) : null}
                          {!document.phase && !document.contract && !document.measurement ? (
                            <span className="text-xs text-muted-foreground">Sem vínculos adicionais</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {document.fileUrl ? (
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                        >
                          Abrir arquivo
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Arquivo sem URL disponível
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </ProjectSectionCard>

        <div className="space-y-6">
          <ProjectSectionCard
            eyebrow="Upload"
            title="Novo documento"
            description="Envie arquivos usando a mesma infraestrutura de storage já adotada no sistema."
          >
            {!canManageDocuments ? (
              <ProjectEmptyBlock
                title="Acesso somente leitura"
                description="Seu perfil pode consultar o acervo, mas o envio de documentos fica disponível apenas para perfis gestores."
              />
            ) : !compatibility.documentSchemaReady ? (
              <ProjectEmptyBlock
                title="Migration pendente"
                description={compatibility.notice ?? "A gestão documental ampliada ainda não está pronta neste ambiente."}
              />
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {feedback ? (
                  <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
                    {feedback}
                  </div>
                ) : null}
                {submitError ? (
                  <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
                    {submitError}
                  </div>
                ) : null}

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Categoria *</span>
                  <select
                    value={form.documentType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        documentType: event.target.value as UploadFormState["documentType"],
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                  >
                    {PROJECT_DOCUMENT_TYPE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {getProjectDocumentTypeLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Título</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Opcional. Se vazio, usamos o nome do arquivo."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Descrição</span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Metadados básicos, referência administrativa ou contexto técnico."
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Data do documento</span>
                    <input
                      type="date"
                      value={form.documentDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          documentDate: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Área técnica</span>
                    <select
                      value={form.technicalArea}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          technicalArea: (event.target.value || "") as "" | ProjectTechnicalArea,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                    >
                      <option value="">Sem vínculo por área</option>
                      {technicalAreas.map((area) => (
                        <option key={area} value={area}>
                          {getProjectTechnicalAreaLabel(area)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isPublic: event.target.checked }))
                    }
                  />
                  Disponível para visibilidade pública
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Arquivos *</span>
                  <input
                    type="file"
                    multiple
                    onChange={(event) =>
                      setPendingFiles(Array.from(event.target.files ?? []))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                  />
                  <p className="text-xs text-muted-foreground">
                    PDF, imagens e planilhas. Você pode enviar até 10 arquivos por vez.
                  </p>
                </label>

                {pendingFiles.length > 0 ? (
                  <div className="rounded-xl border border-border bg-background px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Arquivos prontos
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-foreground">
                      {pendingFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`}>
                          {file.name} · {formatFileSize(file.size)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving ? "Enviando documentos..." : "Enviar documentos"}
                </button>
              </form>
            )}
          </ProjectSectionCard>

          <ProjectSectionCard
            eyebrow="Categorias"
            title="Distribuição documental"
            description="Leitura rápida das categorias mais utilizadas no projeto."
          >
            {categoryBreakdown.length === 0 ? (
              <ProjectEmptyBlock
                title="Sem categorias ainda"
                description="Envie documentos para começar a distribuição por categoria."
              />
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((entry) => (
                  <div
                    key={entry.documentType}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getProjectDocumentTypeLabel(entry.documentType)}
                      </p>
                    </div>
                    <ProjectBadge label={`${entry.count} item(ns)`} tone="neutral" />
                  </div>
                ))}
              </div>
            )}
          </ProjectSectionCard>
        </div>
      </div>
    </div>
  );
}
