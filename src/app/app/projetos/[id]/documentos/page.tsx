import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { ProjectDocumentsClient } from "@/components/projetos/project-documents-client";
import { authOptions } from "@/lib/auth";
import { getProjectDocumentsData } from "@/lib/project-detail-data";

type ProjetoDocumentosPageProps = {
  params: Promise<{ id: string }>;
};

const DOCUMENT_WRITE_ROLES = new Set(["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"]);

export default async function ProjetoDocumentosPage({
  params,
}: ProjetoDocumentosPageProps) {
  const { id } = await params;
  const [data, session] = await Promise.all([
    getProjectDocumentsData(id),
    getServerSession(authOptions),
  ]);

  if (!data) {
    notFound();
  }

  const canManageDocuments = DOCUMENT_WRITE_ROLES.has(session?.user?.role ?? "");

  return (
    <ProjectDocumentsClient
      projectId={data.project.id}
      projectCode={data.project.code ?? null}
      projectName={data.project.name}
      initialDocuments={data.documents}
      initialIndicators={data.documentIndicators}
      technicalAreas={data.project.technicalAreas}
      canManageDocuments={canManageDocuments}
      compatibility={{
        documentSchemaReady: data.compatibility.documentSchemaReady,
        measurementSchemaReady: data.compatibility.measurementSchemaReady,
        notice: data.compatibility.documentNotice,
      }}
    />
  );
}
