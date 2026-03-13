import { notFound } from "next/navigation";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import { getProjectDocumentsData } from "@/lib/project-detail-data";
import { getProjectDocumentTypeLabel } from "@/lib/project-labels";
import { formatDate, formatNumber } from "@/lib/utils";

type ProjetoDocumentosPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoDocumentosPage({
  params,
}: ProjetoDocumentosPageProps) {
  const { id } = await params;
  const data = await getProjectDocumentsData(id);

  if (!data) {
    notFound();
  }

  const { documents } = data;
  const publicCount = documents.filter((document) => document.isPublic).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-3">
        <ProjectMetricCard
          label="Documentos"
          value={formatNumber(documents.length)}
          helper="Acervo documental do projeto."
        />
        <ProjectMetricCard
          label="Públicos"
          value={formatNumber(publicCount)}
          helper="Disponíveis para visibilidade externa."
        />
        <ProjectMetricCard
          label="Tipos"
          value={formatNumber(new Set(documents.map((item) => item.documentType)).size)}
          helper="Categorias documentais utilizadas."
        />
      </section>

      <ProjectSectionCard
        eyebrow="Documentos"
        title="Acervo do projeto"
        description="Documentos técnicos, contratuais e administrativos vinculados ao projeto."
      >
        {documents.length === 0 ? (
          <ProjectEmptyBlock
            title="Nenhum documento cadastrado"
            description="Cadastre documentos para consolidar o histórico técnico, financeiro e administrativo do projeto."
          />
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <article
                key={document.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{document.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getProjectDocumentTypeLabel(document.documentType)} · {document.fileName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {document.isPublic ? (
                      <ProjectBadge label="Público" tone="success" />
                    ) : (
                      <ProjectBadge label="Interno" tone="neutral" />
                    )}
                    {document.phase ? (
                      <ProjectBadge
                        label={`Fase ${document.phase.sequence}`}
                        tone="brand"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Data
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {document.documentDate ? formatDate(document.documentDate) : "Não informada"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Autor
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {document.uploadedBy?.name || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Contrato
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {document.contract?.title || "Não vinculado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Medição
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {document.measurement
                        ? `#${document.measurement.measurementNumber}`
                        : "Não vinculada"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>
    </div>
  );
}
