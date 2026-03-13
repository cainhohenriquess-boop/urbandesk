import { ProjectEmptyState } from "@/components/projetos/project-empty-state";

type ProjetoDocumentosPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjetoDocumentosPage({
  params,
}: ProjetoDocumentosPageProps) {
  const { id } = await params;

  return (
    <ProjectEmptyState
      projectId={id}
      title="Nenhum documento cadastrado"
      description="Esta área já está pronta para receber documentos do projeto. A modelagem documental ainda não foi implementada nesta etapa."
    />
  );
}
